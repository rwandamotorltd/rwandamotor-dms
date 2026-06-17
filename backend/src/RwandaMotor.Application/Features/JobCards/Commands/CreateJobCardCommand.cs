using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Entities;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.JobCards.Commands;

public record CreateJobCardCommand(
    Guid VehicleId,
    Guid? CustomerId,
    Guid? TechnicianId,
    ServiceType ServiceType,
    FuelLevel FuelLevel,
    int Mileage,
    string? Notes,
    string? AdditionalInfo,
    List<string>? AccessoriesPresent
) : IRequest<(Guid Id, string JobCardNumber)>;

public class CreateJobCardCommandValidator : AbstractValidator<CreateJobCardCommand>
{
    public CreateJobCardCommandValidator()
    {
        RuleFor(x => x.VehicleId).NotEmpty();
        RuleFor(x => x.Mileage).GreaterThanOrEqualTo(0);
    }
}

public class CreateJobCardCommandHandler : IRequestHandler<CreateJobCardCommand, (Guid Id, string JobCardNumber)>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IEmailService _email;

    public CreateJobCardCommandHandler(IApplicationDbContext db, ICurrentUserService currentUser, IEmailService email)
    {
        _db = db;
        _currentUser = currentUser;
        _email = email;
    }

    public async Task<(Guid Id, string JobCardNumber)> Handle(CreateJobCardCommand cmd, CancellationToken ct)
    {
        // Fetch vehicle (with brand/model/customer)
        var vehicle = await _db.Vehicles
            .Include(v => v.Brand)
            .Include(v => v.Model)
            .Include(v => v.Customer)
            .FirstOrDefaultAsync(v => v.Id == cmd.VehicleId && !v.IsDeleted, ct)
            ?? throw new InvalidOperationException("Vehicle not found");

        // Generate job card number
        var jobCardNumber = await GenerateNumberAsync(ct);

        // Resolve customer — prefer explicit customerId from caller, fall back to vehicle's link
        var customerId = cmd.CustomerId ?? vehicle.CustomerId;
        var customerName  = vehicle.Customer?.FullName;
        var customerPhone = vehicle.Customer?.Phone;
        var customerEmail = vehicle.Customer?.Email;

        if (cmd.CustomerId.HasValue && cmd.CustomerId != vehicle.CustomerId)
        {
            // Caller explicitly chose a different customer — look them up
            var cust = await _db.Customers.FindAsync(new object[] { cmd.CustomerId.Value }, ct);
            customerName  = cust?.FullName;
            customerPhone = cust?.Phone;
            customerEmail = cust?.Email;
        }
        else if (vehicle.Customer == null && customerId.HasValue)
        {
            // Include() produced null (e.g. global filter edge case) but FK is set — direct lookup
            var cust = await _db.Customers.FindAsync(new object[] { customerId.Value }, ct);
            customerName  = cust?.FullName;
            customerPhone = cust?.Phone;
            customerEmail = cust?.Email;
        }

        var jobCard = new JobCard
        {
            JobCardNumber = jobCardNumber,
            VehicleId = cmd.VehicleId,
            CustomerId = customerId,
            TechnicianId = cmd.TechnicianId,
            VIN = vehicle.VIN,
            PlateNumber = vehicle.PlateNumber,
            Year = vehicle.Year,
            Color = vehicle.Color,
            Transmission = vehicle.Transmission,
            FuelType = vehicle.FuelType,
            FuelLevel = cmd.FuelLevel,
            Mileage = cmd.Mileage,
            CustomerName = customerName,
            CustomerPhone = customerPhone,
            ServiceType = cmd.ServiceType,
            Notes = cmd.Notes,
            AdditionalInfo = cmd.AdditionalInfo,
            AccessoriesPresent = cmd.AccessoriesPresent ?? new List<string>(),
            Status = JobCardStatus.Open,
            ReceivedByUserId = _currentUser.UserId,
            ReceivedByName = _currentUser.UserName ?? _currentUser.Email ?? "Unknown",
            CreatedBy = _currentUser.UserId
        };

        _db.JobCards.Add(jobCard);
        await _db.SaveChangesAsync(ct);

        // Fire-and-forget: notify customer their vehicle is in for service
        if (!string.IsNullOrWhiteSpace(customerEmail))
        {
            var settings   = await _db.CompanySettings.FindAsync(new object[] { Domain.Entities.CompanySettings.SingletonId }, ct)
                             ?? new Domain.Entities.CompanySettings();
            var brandName  = vehicle.Brand?.Name ?? "";
            var modelName  = vehicle.Model?.Name ?? "";
            var html       = JobCardCreatedEmailBuilder.Build(jobCard, brandName, modelName,
                                 _currentUser.UserName ?? "Service Advisor",
                                 settings.EmailJobCardMessage);
            var subject    = $"Repair Order {jobCardNumber} — Your Vehicle Is In Service";
            var _ = _email.SendAsync(customerEmail, subject, html, CancellationToken.None);
        }

        return (jobCard.Id, jobCardNumber);
    }

    private async Task<string> GenerateNumberAsync(CancellationToken ct)
    {
        var year = DateTime.UtcNow.Year;
        var twoDigitYear = year % 100; // 2026 → 26

        var seq = await _db.JobCardSequences
            .FirstOrDefaultAsync(s => s.Year == year, ct);

        if (seq == null)
        {
            seq = new JobCardSequence
            {
                Year = year,
                StartingSequence = 1,
                CurrentSequence = 0
            };
            _db.JobCardSequences.Add(seq);
        }

        // If sequence has not started yet, initialise from StartingSequence
        if (seq.CurrentSequence == 0)
            seq.CurrentSequence = seq.StartingSequence;
        else
            seq.CurrentSequence++;

        return $"OR{twoDigitYear:D2}{seq.CurrentSequence:D5}";
    }
}

file static class JobCardCreatedEmailBuilder
{
    private static string TDL => "padding:8px 0;border-bottom:1px solid #eee;color:#666;width:40%;font-size:13px";
    private static string TD  => "padding:8px 0;border-bottom:1px solid #eee;font-weight:500;font-size:13px";
    private static string E(string? s) => System.Net.WebUtility.HtmlEncode(s ?? "—");

    private const string DefaultMessage =
        "Dear {CustomerName}, your vehicle has been received and a repair order has been opened. Our team will keep you informed of progress.";

    internal static string Build(JobCard jc, string brand, string model, string advisor, string? messageTemplate)
    {
        var msg = (messageTemplate ?? DefaultMessage)
            .Replace("{CustomerName}",   E(jc.CustomerName))
            .Replace("{ReferenceNumber}", E(jc.JobCardNumber));

        return "<html><head><meta charset='utf-8'></head>"
             + "<body style='font-family:Arial,sans-serif;color:#1a1a1a;margin:0;padding:20px;background:#f5f5f5'>"
             + "<div style='background:#fff;border-radius:8px;padding:28px 32px;max-width:580px;margin:0 auto'>"
             + $"<h2 style='font-size:17px;margin:0 0 2px;color:#111;font-weight:600'>Repair Order {E(jc.JobCardNumber)}</h2>"
             + "<p style='color:#888;font-size:12px;margin:0 0 20px;letter-spacing:.3px'>RWANDAMOTOR LTD &mdash; Service Department</p>"
             + "<hr style='border:none;border-top:1px solid #f0f0f0;margin:0 0 18px'>"
             + $"<p style='font-size:13px;color:#333;margin:0 0 20px;line-height:1.65'>{msg}</p>"
             + "<table style='width:100%;border-collapse:collapse'>"
             + $"<tr><td style='{TDL}'>Repair Order</td><td style='{TD}'>{E(jc.JobCardNumber)}</td></tr>"
             + $"<tr><td style='{TDL}'>Vehicle</td><td style='{TD}'>{E($"{brand} {model}")} ({jc.Year})</td></tr>"
             + $"<tr><td style='{TDL}'>VIN</td><td style='{TD}'>{E(jc.VIN)}</td></tr>"
             + $"<tr><td style='{TDL}'>Plate Number</td><td style='{TD}'>{E(jc.PlateNumber)}</td></tr>"
             + $"<tr><td style='{TDL}'>Service</td><td style='{TD}'>{E(jc.ServiceType.ToString())}</td></tr>"
             + $"<tr><td style='{TDL}'>Mileage In</td><td style='{TD}'>{jc.Mileage:N0} km</td></tr>"
             + $"<tr><td style='{TDL}'>Received By</td><td style='{TD}'>{E(advisor)}</td></tr>"
             + "</table>"
             + "<p style='margin-top:24px;font-size:11px;color:#bbb;text-align:center'>RWANDAMOTOR LTD</p>"
             + "</div></body></html>";
    }
}
