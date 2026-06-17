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

        // Generate Delivery Note number: DN + YY + same sequence as job card
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

        var serviceRecord = new ServiceRecord
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
        };
        _db.ServiceRecords.Add(serviceRecord);

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

        // If PDI -> create a SalesHistory entry
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
        }

        await _db.SaveChangesAsync(ct);

        // Re-evaluate retention status after new service
        await _retentionEngine.EvaluateVehicleStatusAsync(jobCard.VehicleId, ct);

        // Fire-and-forget: notify customer their vehicle is ready
        var customerEmail = jobCard.Customer?.Email
                         ?? (jobCard.CustomerId.HasValue
                             ? (await _db.Customers.FindAsync(new object[] { jobCard.CustomerId.Value }, ct))?.Email
                             : null);
        if (!string.IsNullOrWhiteSpace(customerEmail))
        {
            Domain.Entities.CompanySettings? settings = null;
            try { settings = await _db.CompanySettings.FindAsync(new object[] { Domain.Entities.CompanySettings.SingletonId }, ct); }
            catch { /* columns not yet migrated — fall back to defaults */ }
            settings ??= new Domain.Entities.CompanySettings();
            var brand   = jobCard.Vehicle?.Brand?.Name ?? "";
            var model   = jobCard.Vehicle?.Model?.Name ?? "";
            var html    = DeliveryNoteEmailBuilder.Build(jobCard, brand, model, settings.EmailDeliveryNoteMessage);
            var subject = "Thank You for Choosing RWANDAMOTOR LTD";
            var _ = _email.SendAsync(customerEmail, subject, html, CancellationToken.None);
        }

        return dnNumber;
    }
}

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

      <!-- Recommendation — green left bar via narrow td (Outlook-safe) -->
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
