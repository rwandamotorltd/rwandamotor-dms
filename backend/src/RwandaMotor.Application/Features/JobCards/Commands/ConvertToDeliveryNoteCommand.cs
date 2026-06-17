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
            var subject = "Your Vehicle Is Ready for Collection — RWANDAMOTOR LTD";
            var _ = _email.SendAsync(customerEmail, subject, html, CancellationToken.None);
        }

        return dnNumber;
    }
}

file static class DeliveryNoteEmailBuilder
{
    private static string TDL => "padding:8px 0;border-bottom:1px solid #eee;color:#666;width:40%;font-size:13px";
    private static string TD  => "padding:8px 0;border-bottom:1px solid #eee;font-weight:500;font-size:13px";
    private static string E(string? s) => System.Net.WebUtility.HtmlEncode(s ?? "—");

    private const string DefaultMessage =
        "Dear {CustomerName}, thank you for trusting us with your {VehicleModel}. Your vehicle service is now complete and ready for collection. We are glad to have served you.";

    internal static string Build(JobCard jc, string brand, string model, string? messageTemplate)
    {
        var vehicleLabel = $"{brand} {model}".Trim();

        var msg = (messageTemplate ?? DefaultMessage)
            .Replace("{CustomerName}",  E(jc.CustomerName))
            .Replace("{VehicleModel}",  E(vehicleLabel));

        return "<html><head><meta charset='utf-8'></head>"
             + "<body style='font-family:Arial,sans-serif;color:#1a1a1a;margin:0;padding:20px;background:#f5f5f5'>"
             + "<div style='background:#fff;border-radius:8px;padding:28px 32px;max-width:560px;margin:0 auto'>"
             + "<p style='color:#888;font-size:12px;margin:0 0 20px;letter-spacing:.4px;text-transform:uppercase'>RWANDAMOTOR LTD &mdash; Service Department</p>"
             + "<hr style='border:none;border-top:1px solid #f0f0f0;margin:0 0 20px'>"
             + $"<p style='font-size:14px;color:#333;margin:0 0 22px;line-height:1.75'>{msg}</p>"
             + "<table style='width:100%;border-collapse:collapse;margin-bottom:22px'>"
             + $"<tr><td style='{TDL}'>Vehicle</td><td style='{TD}'>{E(vehicleLabel)}{(jc.Year > 0 ? $" ({jc.Year})" : "")}</td></tr>"
             + $"<tr><td style='{TDL}'>Plate Number</td><td style='{TD}'>{E(jc.PlateNumber)}</td></tr>"
             + "</table>"
             + "<div style='background:#f6faf8;border-left:3px solid #2d7d52;border-radius:0 4px 4px 0;padding:12px 16px;margin-bottom:26px'>"
             + "<p style='font-size:13px;color:#333;margin:0;line-height:1.65'>"
             + "<strong>Our recommendation:</strong> For the best performance and long life of your vehicle, "
             + "we always recommend using <strong>genuine manufacturer-approved parts</strong>. "
             + "Our team is here to help whenever you need us."
             + "</p></div>"
             + "<p style='margin:0;font-size:11px;color:#ccc;text-align:center'>RWANDAMOTOR LTD &mdash; We care about your vehicle</p>"
             + "</div></body></html>";
    }
}
