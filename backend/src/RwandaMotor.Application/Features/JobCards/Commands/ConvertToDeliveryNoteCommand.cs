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

    public ConvertToDeliveryNoteCommandHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
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
        // Extract sequence from job card number (last 5 digits)
        var dnNumber = "DN" + jobCard.JobCardNumber[2..]; // OR2600001 → DN2600001

        jobCard.Status = JobCardStatus.Closed;
        jobCard.ClosedAt = now;
        jobCard.ClosedByUserId = _currentUser.UserId;
        jobCard.ClosedByName = _currentUser.UserName ?? _currentUser.Email ?? "Unknown";
        jobCard.DeliveryNoteNumber = dnNumber;
        jobCard.DeliveryNoteGeneratedAt = now;
        jobCard.UpdatedAt = now;
        jobCard.UpdatedBy = _currentUser.UserId;

        // If PDI → create a SalesHistory entry
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

        return dnNumber;
    }
}
