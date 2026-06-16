using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Quartz;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Enums;
using RwandaMotor.Infrastructure.Services;

namespace RwandaMotor.Infrastructure.BackgroundJobs;

/// <summary>Runs nightly: recalculates retention status then emails a summary of newly-due vehicles.</summary>
[DisallowConcurrentExecution]
public class RetentionEvaluationJob : IJob
{
    private readonly IRetentionEngine _engine;
    private readonly IEmailService _email;
    private readonly IApplicationDbContext _db;
    private readonly SmtpSettings _smtp;
    private readonly ILogger<RetentionEvaluationJob> _logger;

    public RetentionEvaluationJob(
        IRetentionEngine engine,
        IEmailService email,
        IApplicationDbContext db,
        IOptions<SmtpSettings> smtp,
        ILogger<RetentionEvaluationJob> logger)
    {
        _engine = engine;
        _email  = email;
        _db     = db;
        _smtp   = smtp.Value;
        _logger = logger;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        var ct = context.CancellationToken;
        _logger.LogInformation("RetentionEvaluationJob started at {Time}", DateTime.UtcNow);
        try
        {
            await _engine.EvaluateAllVehiclesAsync(ct);
            _logger.LogInformation("RetentionEvaluationJob completed at {Time}", DateTime.UtcNow);

            await SendServiceAlertAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "RetentionEvaluationJob failed");
            throw;
        }
    }

    private async Task SendServiceAlertAsync(CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_smtp.AlertRecipient))
        {
            _logger.LogDebug("AlertRecipient not configured — skipping service alert email");
            return;
        }

        var today = DateTime.UtcNow.Date;

        var vehicles = await _db.Vehicles
            .Include(v => v.Customer)
            .Where(v => !v.IsDeleted
                && v.IsSoldByDealership
                && (v.RetentionStatus == RetentionStatus.DueSoon || v.RetentionStatus == RetentionStatus.Overdue)
                && v.RetentionStatusUpdatedAt.HasValue
                && v.RetentionStatusUpdatedAt.Value.Date == today)
            .OrderBy(v => v.RetentionStatus)
            .ThenBy(v => v.NextServiceDate)
            .ToListAsync(ct);

        if (vehicles.Count == 0)
        {
            _logger.LogInformation("No newly-due vehicles today — alert email skipped");
            return;
        }

        var dueSoon  = vehicles.Where(v => v.RetentionStatus == RetentionStatus.DueSoon).ToList();
        var overdue  = vehicles.Where(v => v.RetentionStatus == RetentionStatus.Overdue).ToList();

        var rows = new System.Text.StringBuilder();
        foreach (var v in vehicles)
        {
            var badge = v.RetentionStatus == RetentionStatus.Overdue
                ? "<span style='color:#c92a2a;font-weight:600'>Overdue</span>"
                : "<span style='color:#e67700;font-weight:600'>Due Soon</span>";
            var lastSvc = v.LastServiceDate.HasValue ? v.LastServiceDate.Value.ToString("dd MMM yyyy") : "Never";
            var nextSvc = v.NextServiceDate.HasValue ? v.NextServiceDate.Value.ToString("dd MMM yyyy") : "—";

            rows.Append($"""
                <tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee">{System.Net.WebUtility.HtmlEncode(v.VIN)}</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee">{System.Net.WebUtility.HtmlEncode(v.PlateNumber ?? "—")}</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee">{System.Net.WebUtility.HtmlEncode(v.Customer?.FullName ?? "—")}</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee">{System.Net.WebUtility.HtmlEncode(v.Customer?.Phone ?? "—")}</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee">{lastSvc}</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee">{nextSvc}</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee">{badge}</td>
                </tr>
                """);
        }

        var thStyle = "background:#f1f3f5;padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#666;letter-spacing:.05em";
        var html = "<html><head><meta charset='utf-8'></head>"
            + "<body style='font-family:Arial,sans-serif;color:#1a1a1a;margin:0;padding:20px;background:#f5f5f5'>"
            + "<div style='background:#fff;border-radius:8px;padding:32px;max-width:800px;margin:0 auto'>"
            + $"<h1 style='font-size:20px;margin:0 0 4px;color:#111'>Service Due Alert &mdash; {today:dd MMM yyyy}</h1>"
            + "<p style='color:#666;font-size:14px;margin:0 0 24px'>Rwanda Motor DMS &middot; Nightly retention evaluation</p>"
            + "<table style='margin-bottom:24px;border-collapse:collapse'><tr>"
            + $"<td style='padding:6px 20px 6px 0;font-size:14px'><strong style='font-size:22px;color:#e67700'>{dueSoon.Count}</strong>&nbsp;Due Soon</td>"
            + $"<td style='padding:6px 0;font-size:14px'><strong style='font-size:22px;color:#c92a2a'>{overdue.Count}</strong>&nbsp;Overdue</td>"
            + "</tr></table>"
            + "<table style='width:100%;border-collapse:collapse;font-size:13px'><thead><tr>"
            + $"<th style='{thStyle}'>VIN</th><th style='{thStyle}'>Plate</th><th style='{thStyle}'>Customer</th>"
            + $"<th style='{thStyle}'>Phone</th><th style='{thStyle}'>Last Service</th>"
            + $"<th style='{thStyle}'>Next Service</th><th style='{thStyle}'>Status</th>"
            + $"</tr></thead><tbody>{rows}</tbody></table>"
            + $"<p style='margin-top:24px;font-size:12px;color:#999;text-align:center'>Rwanda Motor Ltd &middot; Generated at {DateTime.UtcNow:HH:mm} UTC</p>"
            + "</div></body></html>";

        var subject = $"[DMS] Service Alert: {dueSoon.Count} due soon, {overdue.Count} overdue — {today:dd MMM yyyy}";
        await _email.SendAsync(_smtp.AlertRecipient, subject, html, ct);
        _logger.LogInformation("Service alert email sent for {Count} vehicles", vehicles.Count);
    }
}
