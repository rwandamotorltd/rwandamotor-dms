using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.Vehicles.Commands;

/// <summary>
/// Applies the same set of optional field updates to a list of vehicle IDs.
/// Only non-null fields are applied — a null value means "don't change this field."
/// </summary>
public record BulkUpdateVehiclesCommand(
    List<Guid> VehicleIds,
    RetentionStatus? RetentionStatus,
    Guid? ServicePolicyId,
    string? Notes,
    // Plate change only makes sense 1-to-1, but we allow suffix-append bulk use-case
    string? NotesAppend
) : IRequest<int>; // returns count of updated vehicles

public class BulkUpdateVehiclesCommandValidator : AbstractValidator<BulkUpdateVehiclesCommand>
{
    public BulkUpdateVehiclesCommandValidator()
    {
        RuleFor(x => x.VehicleIds).NotEmpty().Must(ids => ids.Count <= 200)
            .WithMessage("Bulk update is limited to 200 vehicles at a time.");
        RuleFor(x => x.Notes).MaximumLength(2000).When(x => x.Notes != null);
        RuleFor(x => x.NotesAppend).MaximumLength(500).When(x => x.NotesAppend != null);
    }
}

public class BulkUpdateVehiclesCommandHandler : IRequestHandler<BulkUpdateVehiclesCommand, int>
{
    private readonly IApplicationDbContext _db;

    public BulkUpdateVehiclesCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<int> Handle(BulkUpdateVehiclesCommand cmd, CancellationToken ct)
    {
        var vehicles = await _db.Vehicles
            .Where(v => cmd.VehicleIds.Contains(v.Id) && !v.IsDeleted)
            .ToListAsync(ct);

        foreach (var vehicle in vehicles)
        {
            if (cmd.RetentionStatus.HasValue)
            {
                vehicle.RetentionStatus = cmd.RetentionStatus.Value;
                vehicle.RetentionStatusUpdatedAt = DateTime.UtcNow;
            }
            if (cmd.ServicePolicyId.HasValue)
                vehicle.ServicePolicyId = cmd.ServicePolicyId.Value;
            if (cmd.Notes is not null)
                vehicle.Notes = cmd.Notes.Trim();
            if (cmd.NotesAppend is not null)
                vehicle.Notes = string.IsNullOrWhiteSpace(vehicle.Notes)
                    ? cmd.NotesAppend.Trim()
                    : $"{vehicle.Notes}\n{cmd.NotesAppend.Trim()}";
        }

        await _db.SaveChangesAsync(ct);
        return vehicles.Count;
    }
}
