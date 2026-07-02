using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.JobCards.Commands;

public record UpdateJobCardCommand(
    Guid Id,
    string ServiceType,
    Guid? TechnicianId,
    FuelLevel FuelLevel,
    int Mileage,
    string? Notes,
    string? AdditionalInfo,
    List<string> AccessoriesPresent
) : IRequest<bool>;

public class UpdateJobCardCommandHandler : IRequestHandler<UpdateJobCardCommand, bool>
{
    private readonly IApplicationDbContext _db;

    public UpdateJobCardCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<bool> Handle(UpdateJobCardCommand request, CancellationToken ct)
    {
        var jobCard = await _db.JobCards.FirstOrDefaultAsync(j => j.Id == request.Id && !j.IsDeleted, ct)
            ?? throw new InvalidOperationException("Job card not found");

        if (jobCard.Status != JobCardStatus.Open)
            throw new InvalidOperationException("Cannot edit a closed job card");

        // Update technician name snapshot if technician changed
        string? techName = jobCard.Technician?.FullName;
        if (request.TechnicianId != jobCard.TechnicianId)
        {
            if (request.TechnicianId.HasValue)
            {
                var tech = await _db.Technicians.FindAsync(new object[] { request.TechnicianId.Value }, ct);
                techName = tech?.FullName;
            }
            else
            {
                techName = null;
            }
        }

        jobCard.ServiceType        = request.ServiceType;
        jobCard.TechnicianId       = request.TechnicianId;
        jobCard.FuelLevel          = request.FuelLevel;
        jobCard.Mileage            = request.Mileage;
        jobCard.Notes              = request.Notes;
        jobCard.AdditionalInfo     = request.AdditionalInfo;
        jobCard.AccessoriesPresent = request.AccessoriesPresent;
        jobCard.UpdatedAt          = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return true;
    }
}
