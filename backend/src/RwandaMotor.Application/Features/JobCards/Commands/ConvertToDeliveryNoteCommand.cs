using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Entities;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.JobCards.Commands;

public record ConvertToDeliveryNoteCommand(Guid JobCardId) : IRequest<string>;

public class ConvertToDeliveryNoteCommandHandler : IRequestHandler<ConvertToDeliveryNoteCommand, string>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IServiceIntervalEngine _intervalEngine;
    private readonly IRetentionEngine _retentionEngine;
    private readonly IEmailService _email;

    public ConvertToDeliveryNoteCommandHandler(
        IApplicationDbContext db,
        ICurrentUserService currentUser,
        IServiceIntervalEngine intervalEngine,
        IRetentionEngine retentionEngine,
        IEmailService email)
    {
        _db = db;
        _currentUser = currentUser;
        _intervalEngine = intervalEngine;
        _retentionEngine = retentionEngine;
        _email = email;
    }

    public async Task<string> Handle(ConvertToDeliveryNoteCommand cmd, CancellationToken ct)
    {
        var jobCard = await _db.JobCards
            .Include(j => j.Vehicle).ThenInclude(v => v.Brand)
            .Include(j => j.Vehicle).ThenInclude(v => v.Model)
            .Include(j => j.Customer)
            .FirstOrDefaultAsync(j => j.Id == cmd.JobCardId && !j.IsDeleted, ct)
            ?? throw new InvalidOperationException("Job card not found");

        if (jobCard.Status == JobCardStatus.Closed)
            throw new InvalidOperationException("Job card is already closed");

        var now = DateTime.UtcNow;
        var dnNumber = "DN" + jobCard.JobCardNumber[2..]; // OR2600001 -> DN2600001

        jobCard.Status = JobCardStatus.Closed;
        jobCard.ClosedAt = now;
        jobCard.ClosedByUserId = _currentUser.UserId;
        jobCard.ClosedByName = _currentUser.UserName ?? _currentUser.Email ?? "Unknown";
        jobCard.DeliveryNoteNumber = dnNumber;
        jobCard.DeliveryNoteGeneratedAt = now;
        jobCard.UpdatedAt = now;
        jobCard.UpdatedBy = _currentUser.UserId;

        // -- Auto-create Service Record ----------------------------------------
        var nextService = await _intervalEngine.CalculateNextServiceAsync(
            jobCard.VehicleId, jobCard.Mileage, now, ct);

        _db.ServiceRecords.Add(new ServiceRecord
        {
            VehicleId = jobCard.VehicleId,
            TechnicianId = jobCard.TechnicianId,
            ServiceDate = now,
            MileageAtService = jobCard.Mileage,
            ServiceType = jobCard.ServiceType,
            ServiceDescription = $"Auto-created from Job Card {jobCard.JobCardNumber}",
            InvoiceNumber = dnNumber,
            Notes = jobCard.Notes,
            NextServiceMileage = nextService.NextServiceMileage,
            NextServiceDate = nextService.NextServiceDate,
            CreatedBy = _currentUser.UserId
        });

        // Update vehicle service tracking fields
        var vehicle = jobCard.Vehicle;
        if (vehicle != null)
        {
            vehicle.LastServiceDate = now;
            vehicle.LastServiceMileage = jobCard.Mileage;
            vehicle.CurrentMileage = Math.Max(vehicle.CurrentMileage ?? 0, jobCard.Mileage);
            vehicle.NextServiceDate = nextService.NextServiceDate;
            vehicle.NextServiceMileage = nextService.NextServiceMileage;
            vehicle.UpdatedAt = now;
        }

        // If PDI -> create SalesHistory + auto-schedule welcome call follow-up
        if (jobCard.ServiceType == ServiceType.PDI)
        {
            _db.SalesHistories.Add(new SalesHistory
            {
                VehicleId = jobCard.VehicleId,
                CustomerId = jobCard.CustomerId,
                JobCardId = jobCard.Id,
                SaleDate = now,
                SaleType = "PDI",
                VIN = jobCard.VIN,
                PlateNumber = jobCard.PlateNumber,
                CustomerName = jobCard.CustomerName,
                JobCardNumber = jobCard.JobCardNumber,
                DeliveryNoteNumber = dnNumber,
                Notes = "Auto-created from PDI Job Card conversion",
                CreatedBy = _currentUser.UserId
            });

            // Auto-schedule a welcome call follow-up 7 days after PDI delivery
            if (jobCard.CustomerId.HasValue)
            {
                _db.FollowUps.Add(new FollowUp
                {
                    VehicleId = jobCard.VehicleId,
                    CustomerId = jobCard.CustomerId.Value,
                    Status = FollowUpStatus.Pending,
                    Priority = FollowUpPriority.High,
                    ContactMethod = ContactMethod.Phone,
                    Reason = "WelcomeCall",
                    Notes = $"Welcome call after PDI delivery. Remind customer about: first free service at {nextService.NextServiceMileage:N0} km or {nextService.NextServiceDate:dd MMM yyyy}; always use genuine parts for best performance; Rwandamotor is always available for any needs. Job Card: {jobCard.JobCardNumber}",
                    DueDate = now.AddDays(7),
                    CreatedBy = "System"
                });
            }
        }

        await _db.SaveChangesAsync(ct);

        // Re-evaluate retention status after new service
        await _retentionEngine.EvaluateVehicleStatusAsync(jobCard.VehicleId, ct);

        // Fire-and-forget: notify customer
        var customerEmail = jobCard.Customer?.Email
                         ?? (jobCard.CustomerId.HasValue
                             ? (await _db.Customers.FindAsync(new object[] { jobCard.CustomerId.Value }, ct))?.Email
                             : null);
        if (!string.IsNullOrWhiteSpace(customerEmail))
        {
            CompanySettings? settings = null;
            try { settings = await _db.CompanySettings.FindAsync(new object[] { CompanySettings.SingletonId }, ct); }
            catch { /* settings table not yet migrated — fall back to defaults */ }
            settings ??= new CompanySettings();

            var brandName = jobCard.Vehicle?.Brand?.Name ?? "";
            var modelName = jobCard.Vehicle?.Model?.Name ?? "";

            string html;
            string subject;

            if (jobCard.ServiceType == ServiceType.PDI)
            {
                html    = PdiWelcomeEmailBuilder.Build(jobCard, brandName, modelName, nextService, settings.EmailDeliveryNoteMessage);
                subject = $"Welcome to the RWANDAMOTOR Family — {brandName} {modelName}".Trim();
            }
            else
            {
                html    = DeliveryNoteEmailBuilder.Build(jobCard, brandName, modelName, settings.EmailDeliveryNoteMessage);
                subject = "Thank You for Choosing RWANDAMOTOR LTD";
            }

            var _ = _email.SendAsync(customerEmail, subject, html, CancellationToken.None);
        }

        return dnNumber;
    }
}

// ─── PDI welcome email (new vehicle owners) ────────────────────────────────────

file static class PdiWelcomeEmailBuilder
{
    private static string E(string? s) => System.Net.WebUtility.HtmlEncode(s ?? "—");

    internal static string Build(
        JobCard jc, string brand, string model,
        NextServiceResult nextService,
        string? customMessage)
    {
        var vehicleLabel = $"{brand} {model}".Trim();
        var plate        = string.IsNullOrWhiteSpace(jc.PlateNumber) ? "—" : jc.PlateNumber;
        var yearSuffix   = jc.Year > 0 ? $" ({jc.Year})" : "";
        var nextSvcKm    = nextService.NextServiceMileage.ToString("N0") + " km";
        var nextSvcDate  = nextService.NextServiceDate.ToString("dd MMMM yyyy");
        var customerName = !string.IsNullOrWhiteSpace(jc.CustomerName) ? E(jc.CustomerName) : "Valued Customer";

        var welcomeMsg = string.IsNullOrWhiteSpace(customMessage)
            ? $"Dear {customerName}, on behalf of the entire team at RWANDAMOTOR LTD, we are delighted to welcome you to our family! Your new {E(vehicleLabel)} is now officially yours, and we are honoured to have been part of this milestone."
            : customMessage
                .Replace("{CustomerName}", customerName)
                .Replace("{VehicleModel}", E(vehicleLabel));

        return $@"<!DOCTYPE html>
<html lang=""en"">
<head>
  <meta charset=""utf-8"">
  <meta name=""viewport"" content=""width=device-width,initial-scale=1"">
  <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body style=""margin:0;padding:0;background-color:#f5f5f5;"">
<!--[if mso]><table width=""600"" align=""center"" cellpadding=""0"" cellspacing=""0"" border=""0""><tr><td><![endif]-->
<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0"">
<tr><td align=""center"" style=""padding:24px 16px;"">

  <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0"" style=""max-width:580px;"">

    <!-- Card -->
    <tr><td bgcolor=""#ffffff"" style=""background-color:#ffffff;padding:32px 36px 28px;"">

      <!-- Brand line -->
      <p style=""margin:0 0 6px;font-family:Arial,sans-serif;font-size:11px;color:#999999;letter-spacing:1.2px;text-transform:uppercase;"">RWANDAMOTOR LTD &mdash; New Vehicle Delivery</p>

      <!-- Welcome headline -->
      <h1 style=""margin:0 0 18px;font-family:Arial,sans-serif;font-size:22px;color:#1a1a1a;font-weight:bold;"">Welcome to the Rwandamotor Family!</h1>

      <!-- Divider -->
      <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0"" style=""margin-bottom:20px;"">
        <tr><td style=""border-top:1px solid #eeeeee;font-size:0;line-height:0;"">&nbsp;</td></tr>
      </table>

      <!-- Welcome message -->
      <p style=""margin:0 0 20px;font-family:Arial,sans-serif;font-size:14px;color:#333333;line-height:1.8;"">{welcomeMsg}</p>

      <!-- Vehicle details -->
      <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0"" style=""margin-bottom:24px;"">
        <tr>
          <td style=""padding:9px 0;border-bottom:1px solid #eeeeee;font-family:Arial,sans-serif;font-size:13px;color:#888888;width:40%;"">Your New Vehicle</td>
          <td style=""padding:9px 0;border-bottom:1px solid #eeeeee;font-family:Arial,sans-serif;font-size:13px;color:#111111;font-weight:bold;"">{E(vehicleLabel)}{yearSuffix}</td>
        </tr>
        <tr>
          <td style=""padding:9px 0;border-bottom:1px solid #eeeeee;font-family:Arial,sans-serif;font-size:13px;color:#888888;"">Plate Number</td>
          <td style=""padding:9px 0;border-bottom:1px solid #eeeeee;font-family:Arial,sans-serif;font-size:13px;color:#111111;font-weight:bold;"">{E(plate)}</td>
        </tr>
        <tr>
          <td style=""padding:9px 0;font-family:Arial,sans-serif;font-size:13px;color:#888888;"">Delivery Note</td>
          <td style=""padding:9px 0;font-family:Arial,sans-serif;font-size:13px;color:#111111;font-weight:bold;"">{"DN" + jc.JobCardNumber[2..]}</td>
        </tr>
      </table>

      <!-- Service package (green bar) -->
      <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0"" style=""margin-bottom:20px;"">
        <tr>
          <td width=""4"" bgcolor=""#2d7d52"" style=""background-color:#2d7d52;font-size:0;line-height:0;"">&nbsp;</td>
          <td bgcolor=""#f4faf7"" style=""background-color:#f4faf7;padding:14px 16px;"">
            <p style=""margin:0 0 8px;font-family:Arial,sans-serif;font-size:13px;color:#1a5c38;font-weight:bold;"">Your Service Package Includes</p>
            <table role=""presentation"" cellpadding=""0"" cellspacing=""0"" border=""0"">
              <tr><td style=""padding:3px 0;font-family:Arial,sans-serif;font-size:13px;color:#333333;line-height:1.5;"">&#10003;&nbsp; <strong>First service is complimentary</strong> &mdash; at {E(nextSvcKm)} or {E(nextSvcDate)}</td></tr>
              <tr><td style=""padding:3px 0;font-family:Arial,sans-serif;font-size:13px;color:#333333;line-height:1.5;"">&#10003;&nbsp; Regular service interval: <strong>every 5,000 km or 1 year</strong> (whichever comes first)</td></tr>
              <tr><td style=""padding:3px 0;font-family:Arial,sans-serif;font-size:13px;color:#333333;line-height:1.5;"">&#10003;&nbsp; We will contact you <strong>15 days before your service is due</strong></td></tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Genuine parts (amber bar) -->
      <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0"" style=""margin-bottom:28px;"">
        <tr>
          <td width=""4"" bgcolor=""#c07a00"" style=""background-color:#c07a00;font-size:0;line-height:0;"">&nbsp;</td>
          <td bgcolor=""#fffbf0"" style=""background-color:#fffbf0;padding:12px 16px;"">
            <p style=""margin:0;font-family:Arial,sans-serif;font-size:13px;color:#7a4e00;line-height:1.65;"">
              <strong>Our recommendation:</strong> Always use <strong>genuine manufacturer-approved parts</strong> for your {E(vehicleLabel)}. Genuine parts ensure optimal performance, safety, and protect your warranty. Our certified technicians are always ready to help.
            </p>
          </td>
        </tr>
      </table>

      <!-- CTA / contact -->
      <p style=""margin:0 0 20px;font-family:Arial,sans-serif;font-size:13px;color:#555555;line-height:1.7;"">
        We will reach out in the coming days to ensure everything is perfect with your new vehicle. In the meantime, please do not hesitate to contact our service team for any questions or assistance.
      </p>

      <!-- Footer -->
      <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0"" style=""margin-top:8px;"">
        <tr><td style=""border-top:1px solid #eeeeee;font-size:0;line-height:0;padding-bottom:12px;"">&nbsp;</td></tr>
      </table>
      <p style=""margin:0;font-family:Arial,sans-serif;font-size:11px;color:#cccccc;text-align:center;"">RWANDAMOTOR LTD &mdash; Kigali, Rwanda &mdash; We care about your vehicle</p>

    </td></tr>

  </table>
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</body>
</html>";
    }
}

// ─── Standard delivery note email ─────────────────────────────────────────────

file static class DeliveryNoteEmailBuilder
{
    private static string E(string? s) => System.Net.WebUtility.HtmlEncode(s ?? "—");

    private const string DefaultMessage =
        "Dear {CustomerName}, thank you for trusting RWANDAMOTOR LTD with your {VehicleModel}. It was a pleasure serving you and we hope our service met your expectations. We look forward to welcoming you again.";

    internal static string Build(JobCard jc, string brand, string model, string? messageTemplate)
    {
        var vehicleLabel = $"{brand} {model}".Trim();
        var plate        = string.IsNullOrWhiteSpace(jc.PlateNumber) ? "—" : jc.PlateNumber;
        var yearSuffix   = jc.Year > 0 ? $" ({jc.Year})" : "";

        var msg = (messageTemplate ?? DefaultMessage)
            .Replace("{CustomerName}", E(jc.CustomerName))
            .Replace("{VehicleModel}", E(vehicleLabel));

        return $@"<!DOCTYPE html>
<html lang=""en"">
<head>
  <meta charset=""utf-8"">
  <meta name=""viewport"" content=""width=device-width,initial-scale=1"">
  <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body style=""margin:0;padding:0;background-color:#f5f5f5;"">
<!--[if mso]><table width=""600"" align=""center"" cellpadding=""0"" cellspacing=""0"" border=""0""><tr><td><![endif]-->
<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0"">
<tr><td align=""center"" style=""padding:24px 16px;"">

  <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0""
         style=""max-width:580px;"">

    <!-- Card -->
    <tr><td bgcolor=""#ffffff"" style=""background-color:#ffffff;padding:32px 36px 28px;"">

      <!-- Brand line -->
      <p style=""margin:0 0 18px;font-family:Arial,sans-serif;font-size:11px;color:#999999;letter-spacing:1.2px;text-transform:uppercase;"">RWANDAMOTOR LTD &mdash; Service Department</p>

      <!-- Divider -->
      <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0"" style=""margin-bottom:20px;"">
        <tr><td style=""border-top:1px solid #eeeeee;font-size:0;line-height:0;"">&nbsp;</td></tr>
      </table>

      <!-- Message -->
      <p style=""margin:0 0 24px;font-family:Arial,sans-serif;font-size:14px;color:#333333;line-height:1.8;"">{msg}</p>

      <!-- Vehicle details -->
      <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0"" style=""margin-bottom:24px;"">
        <tr>
          <td style=""padding:9px 0;border-bottom:1px solid #eeeeee;font-family:Arial,sans-serif;font-size:13px;color:#888888;width:40%;"">Vehicle</td>
          <td style=""padding:9px 0;border-bottom:1px solid #eeeeee;font-family:Arial,sans-serif;font-size:13px;color:#111111;font-weight:bold;"">{E(vehicleLabel)}{yearSuffix}</td>
        </tr>
        <tr>
          <td style=""padding:9px 0;font-family:Arial,sans-serif;font-size:13px;color:#888888;"">Plate Number</td>
          <td style=""padding:9px 0;font-family:Arial,sans-serif;font-size:13px;color:#111111;font-weight:bold;"">{E(plate)}</td>
        </tr>
      </table>

      <!-- Recommendation -->
      <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0"" style=""margin-bottom:28px;"">
        <tr>
          <td width=""4"" bgcolor=""#2d7d52"" style=""background-color:#2d7d52;font-size:0;line-height:0;"">&nbsp;</td>
          <td bgcolor=""#f4faf7"" style=""background-color:#f4faf7;padding:12px 16px;"">
            <p style=""margin:0;font-family:Arial,sans-serif;font-size:13px;color:#333333;line-height:1.65;"">
              <strong>Our recommendation:</strong> To keep your {E(vehicleLabel)} performing at its best, we always recommend using <strong>genuine manufacturer-approved parts</strong>. Our team remains at your service for any future needs.
            </p>
          </td>
        </tr>
      </table>

      <!-- Footer -->
      <p style=""margin:0;font-family:Arial,sans-serif;font-size:11px;color:#cccccc;text-align:center;"">RWANDAMOTOR LTD &mdash; We care about your vehicle</p>

    </td></tr>

  </table>
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</body>
</html>";
    }
}
