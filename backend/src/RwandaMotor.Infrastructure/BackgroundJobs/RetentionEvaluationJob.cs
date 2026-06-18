using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Quartz;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Entities;
using RwandaMotor.Domain.Enums;
using RwandaMotor.Infrastructure.Services;

namespace RwandaMotor.Infrastructure.BackgroundJobs;

/// <summary>
/// Runs nightly:
///  1. Recalculates retention status for all dealership vehicles
///  2. Creates 6-month proactive follow-ups (ServiceDueReminder)
///  3. Creates 15-day specific follow-ups (ServiceDueReminder — near date)
///  4. Creates Lost recovery follow-ups for newly-lost vehicles
///  5. Creates in-app notifications for all new follow-ups
///  6. Emails the admin a service-due summary
/// </summary>
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
            _logger.LogInformation("RetentionEvaluationJob: retention evaluated");

            await CreateSixMonthFollowUpsAsync(ct);
            await CreateServiceDueRemindersAsync(ct);
            await CreateLostRecoveryFollowUpsAsync(ct);
            await SendServiceAlertAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "RetentionEvaluationJob failed");
            throw;
        }
    }

    // ── 6-month proactive outreach ──────────────────────────────────────────
    private async Task CreateSixMonthFollowUpsAsync(CancellationToken ct)
    {
        var today = DateTime.UtcNow.Date;
        // Vehicles whose last service was between 6m and 6m+2d ago (2-day window avoids re-triggering)
        var from6m = today.AddMonths(-6).AddDays(-2);
        var to6m   = today.AddMonths(-6);

        var vehicles = await _db.Vehicles
            .Include(v => v.Customer)
            .Where(v => !v.IsDeleted
                && v.IsSoldByDealership
                && v.CustomerId.HasValue
                && v.LastServiceDate.HasValue
                && v.LastServiceDate.Value.Date >= from6m
                && v.LastServiceDate.Value.Date <= to6m)
            .ToListAsync(ct);

        if (vehicles.Count == 0) return;

        var vehicleIds = vehicles.Select(v => v.Id).ToList();
        var existing = await _db.FollowUps
            .Where(f => !f.IsDeleted
                && vehicleIds.Contains(f.VehicleId)
                && f.Reason == "ServiceDueReminder"
                && f.Status == FollowUpStatus.Pending)
            .Select(f => f.VehicleId)
            .ToHashSetAsync(ct);

        var created = 0;
        foreach (var v in vehicles)
        {
            if (existing.Contains(v.Id)) continue;

            var followUp = new FollowUp
            {
                VehicleId     = v.Id,
                CustomerId    = v.CustomerId!.Value,
                Status        = FollowUpStatus.Pending,
                Priority      = FollowUpPriority.High,
                ContactMethod = ContactMethod.Phone,
                Reason        = "ServiceDueReminder",
                Notes         = $"6-month service outreach. Last service: {v.LastServiceDate!.Value:dd MMM yyyy}. Contact customer to schedule their next service and remind them to use genuine parts.",
                DueDate       = today,
                CreatedBy     = "System"
            };
            _db.FollowUps.Add(followUp);

            _db.Notifications.Add(new Notification
            {
                Title         = "6-Month Service Follow-up Due",
                Message       = $"{v.Customer?.FullName ?? "Customer"} — {v.PlateNumber ?? v.VIN} hasn't been in for service in 6 months.",
                Type          = NotificationType.ServiceDueSoon,
                VehicleId     = v.Id,
                CustomerId    = v.CustomerId,
                Link          = $"/follow-ups",
                CreatedBy     = "System"
            });

            created++;
        }

        if (created > 0)
        {
            await _db.SaveChangesAsync(ct);
            _logger.LogInformation("Created {Count} 6-month service follow-ups", created);
        }
    }

    // ── 15-day specific service-date reminders ──────────────────────────────
    private async Task CreateServiceDueRemindersAsync(CancellationToken ct)
    {
        var today  = DateTime.UtcNow.Date;
        var cutoff = today.AddDays(15);

        var vehicles = await _db.Vehicles
            .Include(v => v.Customer)
            .Where(v => !v.IsDeleted
                && v.IsSoldByDealership
                && v.CustomerId.HasValue
                && v.NextServiceDate.HasValue
                && v.NextServiceDate.Value.Date >= today
                && v.NextServiceDate.Value.Date <= cutoff)
            .ToListAsync(ct);

        if (vehicles.Count == 0) return;

        var vehicleIds = vehicles.Select(v => v.Id).ToList();
        var existing = await _db.FollowUps
            .Where(f => !f.IsDeleted
                && f.Reason == "ServiceDue15Days"
                && f.Status == FollowUpStatus.Pending
                && vehicleIds.Contains(f.VehicleId))
            .Select(f => f.VehicleId)
            .ToHashSetAsync(ct);

        var created = 0;
        foreach (var v in vehicles)
        {
            if (existing.Contains(v.Id)) continue;

            var dueDate = v.NextServiceDate!.Value.Date.AddDays(-5);
            if (dueDate < today) dueDate = today;

            var followUp = new FollowUp
            {
                VehicleId     = v.Id,
                CustomerId    = v.CustomerId!.Value,
                Status        = FollowUpStatus.Pending,
                Priority      = FollowUpPriority.High,
                ContactMethod = ContactMethod.Phone,
                Reason        = "ServiceDue15Days",
                Notes         = $"Service due on {v.NextServiceDate.Value:dd MMM yyyy}. Call customer to confirm appointment and remind them to use genuine parts.",
                DueDate       = dueDate,
                CreatedBy     = "System"
            };
            _db.FollowUps.Add(followUp);

            _db.Notifications.Add(new Notification
            {
                Title     = "Service Due in 15 Days",
                Message   = $"{v.Customer?.FullName ?? "Customer"} — {v.PlateNumber ?? v.VIN} service due {v.NextServiceDate.Value:dd MMM yyyy}.",
                Type      = NotificationType.ServiceDue15Days,
                VehicleId = v.Id,
                CustomerId= v.CustomerId,
                Link      = "/follow-ups",
                CreatedBy = "System"
            });

            created++;
        }

        if (created > 0)
        {
            await _db.SaveChangesAsync(ct);
            _logger.LogInformation("Created {Count} 15-day service-due follow-ups", created);
        }
    }

    // ── Lost customer recovery follow-ups ───────────────────────────────────
    private async Task CreateLostRecoveryFollowUpsAsync(CancellationToken ct)
    {
        var today = DateTime.UtcNow.Date;

        var lostVehicles = await _db.Vehicles
            .Include(v => v.Customer)
            .Where(v => !v.IsDeleted
                && v.IsSoldByDealership
                && v.CustomerId.HasValue
                && v.RetentionStatus == RetentionStatus.Lost
                // Only newly-lost today to avoid duplicate follow-ups
                && v.RetentionStatusUpdatedAt.HasValue
                && v.RetentionStatusUpdatedAt.Value.Date == today)
            .ToListAsync(ct);

        if (lostVehicles.Count == 0) return;

        var vehicleIds = lostVehicles.Select(v => v.Id).ToList();
        var existing = await _db.FollowUps
            .Where(f => !f.IsDeleted
                && f.Reason == "LostRecovery"
                && f.Status == FollowUpStatus.Pending
                && vehicleIds.Contains(f.VehicleId))
            .Select(f => f.VehicleId)
            .ToHashSetAsync(ct);

        var created = 0;
        foreach (var v in lostVehicles)
        {
            if (existing.Contains(v.Id)) continue;

            var followUp = new FollowUp
            {
                VehicleId     = v.Id,
                CustomerId    = v.CustomerId!.Value,
                Status        = FollowUpStatus.Pending,
                Priority      = FollowUpPriority.Critical,
                ContactMethod = ContactMethod.Phone,
                Reason        = "LostRecovery",
                Notes         = $"Customer has not returned for 12 months (last service: {v.LastServiceDate?.ToString("dd MMM yyyy") ?? "unknown"}). Priority recovery outreach — contact to understand why and offer incentive to return.",
                DueDate       = today,
                CreatedBy     = "System"
            };
            _db.FollowUps.Add(followUp);

            _db.Notifications.Add(new Notification
            {
                Title     = "Customer Marked Lost",
                Message   = $"{v.Customer?.FullName ?? "Customer"} — {v.PlateNumber ?? v.VIN} has not returned in 12 months. Recovery follow-up created.",
                Type      = NotificationType.CustomerLost,
                VehicleId = v.Id,
                CustomerId= v.CustomerId,
                Link      = "/follow-ups",
                CreatedBy = "System"
            });

            created++;
        }

        if (created > 0)
        {
            await _db.SaveChangesAsync(ct);
            _logger.LogInformation("Created {Count} lost-customer recovery follow-ups", created);
        }
    }

    // ── Admin email alert ───────────────────────────────────────────────────
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

        var dueSoon = vehicles.Where(v => v.RetentionStatus == RetentionStatus.DueSoon).ToList();
        var overdue = vehicles.Where(v => v.RetentionStatus == RetentionStatus.Overdue).ToList();

        var rows = new System.Text.StringBuilder();
        foreach (var v in vehicles)
        {
            var badge   = v.RetentionStatus == RetentionStatus.Overdue
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
