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

    public ConvertToDeliveryNoteCommandHandler(
        IApplicationDbContext db,
        ICurrentUserService currentUser,
        IServiceIntervalEngine intervalEngine,
        IRetentionEngine retentionEngine)
    {
        _db = db;
        _currentUser = currentUser;
        _intervalEngine = intervalEngine;
        _retentionEngine = retentionEngine;
    }

    public async Task<string> Handle(ConvertToDeliveryNoteCommand cmd, CancellationToken ct)
    {
        var jobCard = await _db.JobCards
            .Include(j => j.Vehicle)
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

        return dnNumber;
    }
}
