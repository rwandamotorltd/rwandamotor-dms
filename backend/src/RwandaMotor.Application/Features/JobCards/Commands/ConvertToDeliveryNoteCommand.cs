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
        var customerEmail = jobCard.Customer?.Email;
        if (!string.IsNullOrWhiteSpace(customerEmail))
        {
            var brand   = jobCard.Vehicle?.Brand?.Name ?? "";
            var model   = jobCard.Vehicle?.Model?.Name ?? "";
            var html    = DeliveryNoteEmailBuilder.Build(jobCard, dnNumber, brand, model);
            var subject = $"Delivery Note {dnNumber} — Your Vehicle Is Ready for Collection";
            var _ = _email.SendAsync(customerEmail, subject, html, CancellationToken.None);
        }

        return dnNumber;
    }
}

file static class DeliveryNoteEmailBuilder
{
    private static string TDL => "padding:8px 0;border-bottom:1px solid #eee;color:#666;width:40%;font-size:14px";
    private static string TD  => "padding:8px 0;border-bottom:1px solid #eee;font-weight:500;font-size:14px";
    private static string E(string? s) => System.Net.WebUtility.HtmlEncode(s ?? "—");

    internal static string Build(JobCard jc, string dnNumber, string brand, string model)
        => "<html><head><meta charset='utf-8'></head>"
         + "<body style='font-family:Arial,sans-serif;color:#1a1a1a;margin:0;padding:20px;background:#f5f5f5'>"
         + "<div style='background:#fff;border-radius:8px;padding:32px;max-width:600px;margin:0 auto'>"
         + $"<h1 style='font-size:20px;margin:0 0 4px;color:#111'>Delivery Note {E(dnNumber)}</h1>"
         + "<p style='color:#666;font-size:14px;margin:0 0 24px'>Rwanda Motor Ltd &mdash; Service Department</p>"
         + "<div style='background:#f0fff4;border-left:3px solid #22c55e;padding:12px 16px;border-radius:4px;margin:0 0 20px;font-size:14px'>"
         + $"Dear {E(jc.CustomerName)}, your vehicle service is complete and ready for collection. Please bring this reference number when collecting.</div>"
         + "<table style='width:100%;border-collapse:collapse'>"
         + $"<tr><td style='{TDL}'>Delivery Note</td><td style='{TD}'>{E(dnNumber)}</td></tr>"
         + $"<tr><td style='{TDL}'>Repair Order</td><td style='{TD}'>{E(jc.JobCardNumber)}</td></tr>"
         + $"<tr><td style='{TDL}'>Vehicle</td><td style='{TD}'>{E($"{brand} {model}")} ({jc.Year})</td></tr>"
         + $"<tr><td style='{TDL}'>VIN</td><td style='{TD}'>{E(jc.VIN)}</td></tr>"
         + $"<tr><td style='{TDL}'>Plate Number</td><td style='{TD}'>{E(jc.PlateNumber)}</td></tr>"
         + $"<tr><td style='{TDL}'>Service</td><td style='{TD}'>{E(jc.ServiceType.ToString())}</td></tr>"
         + $"<tr><td style='{TDL}'>Closed By</td><td style='{TD}'>{E(jc.ClosedByName)}</td></tr>"
         + "</table>"
         + "<p style='margin-top:24px;font-size:12px;color:#999;text-align:center'>Rwanda Motor Ltd &middot; Sent automatically by the DMS</p>"
         + "</div></body></html>";
}
