using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Entities;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.FollowUps.Commands;

public record SendFollowUpEmailCommand(
    Guid FollowUpId,
    string EmailType // "ServiceReminder" | "SatisfactionCheck"
) : IRequest;

public class SendFollowUpEmailCommandHandler : IRequestHandler<SendFollowUpEmailCommand>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IEmailService _email;

    public SendFollowUpEmailCommandHandler(
        IApplicationDbContext db,
        ICurrentUserService currentUser,
        IEmailService email)
    {
        _db = db;
        _currentUser = currentUser;
        _email = email;
    }

    public async Task Handle(SendFollowUpEmailCommand cmd, CancellationToken ct)
    {
        var followUp = await _db.FollowUps
            .Include(f => f.Vehicle).ThenInclude(v => v.Brand)
            .Include(f => f.Vehicle).ThenInclude(v => v.Model)
            .Include(f => f.Customer)
            .FirstOrDefaultAsync(f => f.Id == cmd.FollowUpId && !f.IsDeleted, ct)
            ?? throw new InvalidOperationException("Follow-up not found");

        var customerEmail = followUp.Customer?.Email;
        if (string.IsNullOrWhiteSpace(customerEmail))
            throw new InvalidOperationException("Customer has no email address on file");

        var brandName    = followUp.Vehicle?.Brand?.Name ?? "";
        var modelName    = followUp.Vehicle?.Model?.Name ?? "";
        var vehicleLabel = $"{brandName} {modelName}".Trim();
        var plate        = followUp.Vehicle?.PlateNumber ?? followUp.Vehicle?.VIN ?? "—";
        var customerName = followUp.Customer?.FullName ?? "Valued Customer";
        var nextService  = followUp.Vehicle?.NextServiceDate?.ToString("dd MMM yyyy") ?? "soon";

        string subject, html;

        if (cmd.EmailType == "SatisfactionCheck")
        {
            subject = $"How is your {vehicleLabel} performing? — RWANDAMOTOR LTD";
            html    = SatisfactionEmailBuilder.Build(customerName, vehicleLabel, plate);
        }
        else
        {
            subject = $"Your {vehicleLabel} service is due — RWANDAMOTOR LTD";
            html    = ServiceReminderEmailBuilder.Build(customerName, vehicleLabel, plate, nextService);
        }

        await _email.SendAsync(customerEmail, subject, html, ct);

        var outcome = cmd.EmailType == "SatisfactionCheck"
            ? InteractionOutcome.SatisfactionEmailSent
            : InteractionOutcome.ServiceReminderEmailSent;

        _db.FollowUpInteractions.Add(new FollowUpInteraction
        {
            FollowUpId = cmd.FollowUpId,
            Outcome    = outcome,
            Notes      = $"{cmd.EmailType} email sent to {customerEmail}",
            EmailType  = cmd.EmailType,
            CreatedBy  = _currentUser.UserId
        });

        followUp.UpdatedAt = DateTime.UtcNow;
        followUp.UpdatedBy = _currentUser.UserId;

        await _db.SaveChangesAsync(ct);
    }
}

file static class ServiceReminderEmailBuilder
{
    private static string E(string? s) => System.Net.WebUtility.HtmlEncode(s ?? "—");

    internal static string Build(string customerName, string vehicle, string plate, string nextServiceDate) => $@"
<!DOCTYPE html><html lang=""en""><head><meta charset=""utf-8"">
<meta name=""viewport"" content=""width=device-width,initial-scale=1""></head>
<body style=""margin:0;padding:0;background:#f5f5f5;"">
<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0""><tr>
<td align=""center"" style=""padding:24px 16px;"">
<table role=""presentation"" width=""100%"" style=""max-width:560px;"" cellpadding=""0"" cellspacing=""0"">
<tr><td bgcolor=""#ffffff"" style=""padding:32px 36px;border-radius:8px;"">
  <p style=""margin:0 0 4px;font-family:Arial,sans-serif;font-size:11px;color:#999;letter-spacing:1.2px;text-transform:uppercase;"">RWANDAMOTOR LTD — Service Reminder</p>
  <h1 style=""margin:0 0 18px;font-family:Arial,sans-serif;font-size:20px;color:#1a1a1a;"">Your Service is Coming Up</h1>
  <table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""margin-bottom:20px;"">
    <tr><td style=""border-top:1px solid #eee;font-size:0;"">&nbsp;</td></tr>
  </table>
  <p style=""margin:0 0 16px;font-family:Arial,sans-serif;font-size:14px;color:#333;line-height:1.8;"">Dear {E(customerName)},<br><br>We hope you are enjoying your <strong>{E(vehicle)}</strong>! We are reaching out to remind you that your next scheduled service is due <strong>{E(nextServiceDate)}</strong>.</p>
  <table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""margin-bottom:20px;"">
    <tr>
      <td width=""4"" bgcolor=""#2d7d52"" style=""font-size:0;"">&nbsp;</td>
      <td bgcolor=""#f4faf7"" style=""padding:12px 16px;"">
        <p style=""margin:0;font-family:Arial,sans-serif;font-size:13px;color:#333;line-height:1.65;"">
          Vehicle: <strong>{E(vehicle)}</strong> &nbsp;|&nbsp; Plate: <strong>{E(plate)}</strong><br>
          Service Due: <strong>{E(nextServiceDate)}</strong><br><br>
          <strong>Our recommendation:</strong> Always use <strong>genuine manufacturer-approved parts</strong> to protect your vehicle's performance and warranty.
        </p>
      </td>
    </tr>
  </table>
  <p style=""margin:0 0 24px;font-family:Arial,sans-serif;font-size:13px;color:#555;line-height:1.7;"">Please call us or visit our workshop to book your service appointment at a time that suits you. Our certified technicians are ready to take care of your vehicle.</p>
  <p style=""margin:0;font-family:Arial,sans-serif;font-size:11px;color:#ccc;text-align:center;"">RWANDAMOTOR LTD — Kigali, Rwanda — We care about your vehicle</p>
</td></tr></table></td></tr></table></body></html>";
}

file static class SatisfactionEmailBuilder
{
    private static string E(string? s) => System.Net.WebUtility.HtmlEncode(s ?? "—");

    internal static string Build(string customerName, string vehicle, string plate) => $@"
<!DOCTYPE html><html lang=""en""><head><meta charset=""utf-8"">
<meta name=""viewport"" content=""width=device-width,initial-scale=1""></head>
<body style=""margin:0;padding:0;background:#f5f5f5;"">
<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0""><tr>
<td align=""center"" style=""padding:24px 16px;"">
<table role=""presentation"" width=""100%"" style=""max-width:560px;"" cellpadding=""0"" cellspacing=""0"">
<tr><td bgcolor=""#ffffff"" style=""padding:32px 36px;border-radius:8px;"">
  <p style=""margin:0 0 4px;font-family:Arial,sans-serif;font-size:11px;color:#999;letter-spacing:1.2px;text-transform:uppercase;"">RWANDAMOTOR LTD — Customer Care</p>
  <h1 style=""margin:0 0 18px;font-family:Arial,sans-serif;font-size:20px;color:#1a1a1a;"">How Is Your Vehicle Performing?</h1>
  <table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""margin-bottom:20px;"">
    <tr><td style=""border-top:1px solid #eee;font-size:0;"">&nbsp;</td></tr>
  </table>
  <p style=""margin:0 0 16px;font-family:Arial,sans-serif;font-size:14px;color:#333;line-height:1.8;"">Dear {E(customerName)},<br><br>We hope everything is going well with your <strong>{E(vehicle)}</strong> ({E(plate)}). As part of our commitment to your satisfaction, we would love to hear how your vehicle is performing.</p>
  <table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""margin-bottom:20px;"">
    <tr>
      <td width=""4"" bgcolor=""#3b82f6"" style=""font-size:0;"">&nbsp;</td>
      <td bgcolor=""#eff6ff"" style=""padding:12px 16px;"">
        <p style=""margin:0;font-family:Arial,sans-serif;font-size:13px;color:#1e3a5f;line-height:1.65;"">
          Is there anything we can help you with? Do you have any concerns about your vehicle? We are always here for you — simply reply to this email or call our service desk.
        </p>
      </td>
    </tr>
  </table>
  <p style=""margin:0 0 24px;font-family:Arial,sans-serif;font-size:13px;color:#555;line-height:1.7;"">We also want to remind you that for the best performance and to protect your warranty, always use <strong>genuine manufacturer-approved parts</strong>. Our team is happy to assist with any service needs.</p>
  <p style=""margin:0;font-family:Arial,sans-serif;font-size:11px;color:#ccc;text-align:center;"">RWANDAMOTOR LTD — Kigali, Rwanda — We care about your vehicle</p>
</td></tr></table></td></tr></table></body></html>";
}
