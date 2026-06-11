using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;

namespace RwandaMotor.Application.Features.Vehicles.Commands;

public record DeleteVehiclesCommand(List<Guid> Ids) : IRequest<int>;

public class DeleteVehiclesCommandHandler : IRequestHandler<DeleteVehiclesCommand, int>
{
    private readonly IApplicationDbContext _db;

    public DeleteVehiclesCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<int> Handle(DeleteVehiclesCommand cmd, CancellationToken ct)
    {
        var vehicles = await _db.Vehicles
            .Where(v => cmd.Ids.Contains(v.Id) && !v.IsDeleted)
            .ToListAsync(ct);

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
