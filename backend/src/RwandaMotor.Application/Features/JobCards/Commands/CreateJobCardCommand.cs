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

    public CreateJobCardCommandHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
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

        // Resolve customer
        var customerId = cmd.CustomerId ?? vehicle.CustomerId;
        var customerName = vehicle.Customer?.FullName;
        var customerPhone = vehicle.Customer?.Phone;

        if (cmd.CustomerId.HasValue && cmd.CustomerId != vehicle.CustomerId)
        {
            var cust = await _db.Customers.FindAsync(new object[] { cmd.CustomerId.Value }, ct);
            customerName = cust?.FullName;
            customerPhone = cust?.Phone;
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
