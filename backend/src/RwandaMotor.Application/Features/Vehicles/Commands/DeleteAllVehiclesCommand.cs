using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.Vehicles.Commands;

/// <summary>
/// Deletes all vehicles that match the given filters (Admin only).
/// Mirrors the filter logic of GetVehiclesQuery so the result is consistent
/// with what the user sees on screen.
/// </summary>
public record DeleteAllVehiclesCommand(
    string? Search,
    RetentionStatus? RetentionStatus,
    bool? IsSoldByDealership
) : IRequest<int>;

public class DeleteAllVehiclesCommandHandler : IRequestHandler<DeleteAllVehiclesCommand, int>
{
    private readonly IApplicationDbContext _db;

    public DeleteAllVehiclesCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<int> Handle(DeleteAllVehiclesCommand cmd, CancellationToken ct)
    {
        var query = _db.Vehicles.Where(v => !v.IsDeleted);

        if (!string.IsNullOrWhiteSpace(cmd.Search))
        {
            var s = cmd.Search.ToLower();
            query = query.Where(v =>
                v.VIN.ToLower().Contains(s) ||
                (v.PlateNumber != null && v.PlateNumber.ToLower().Contains(s)) ||
                (v.Customer != null && v.Customer.FullName.ToLower().Contains(s)) ||
                v.Brand.Name.ToLower().Contains(s) ||
                v.Model.Name.ToLower().Contains(s));
        }

        if (cmd.RetentionStatus.HasValue)
            query = query.Where(v => v.RetentionStatus == cmd.RetentionStatus);

        if (cmd.IsSoldByDealership.HasValue)
            query = query.Where(v => v.IsSoldByDealership == cmd.IsSoldByDealership);

        var vehicles = await query.ToListAsync(ct);

        var now = DateTime.UtcNow;
        foreach (var v in vehicles)
        {
            v.IsDeleted = true;
            v.DeletedAt = now;
            v.DeletedBy = "admin";
        }

        await _db.SaveChangesAsync(ct);
        return vehicles.Count;
    }
}
