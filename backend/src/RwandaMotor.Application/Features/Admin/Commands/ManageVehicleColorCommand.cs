using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Application.Features.Admin.Queries;
using RwandaMotor.Domain.Entities;

namespace RwandaMotor.Application.Features.Admin.Commands;

// ── Create ────────────────────────────────────────────────────────────────────

public record CreateVehicleColorCommand(string Name, int SortOrder = 0)
    : IRequest<VehicleColorDto>;

public class CreateVehicleColorCommandHandler : IRequestHandler<CreateVehicleColorCommand, VehicleColorDto>
{
    private readonly IApplicationDbContext _db;

    public CreateVehicleColorCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<VehicleColorDto> Handle(CreateVehicleColorCommand cmd, CancellationToken ct)
    {
        var color = new VehicleColor { Name = cmd.Name.Trim(), SortOrder = cmd.SortOrder };
        _db.VehicleColors.Add(color);
        await _db.SaveChangesAsync(ct);
        return new VehicleColorDto(color.Id, color.Name, color.SortOrder);
    }
}

// ── Update ────────────────────────────────────────────────────────────────────

public record UpdateVehicleColorCommand(Guid Id, string Name, int SortOrder)
    : IRequest<(bool Success, string? Error)>;

public class UpdateVehicleColorCommandHandler : IRequestHandler<UpdateVehicleColorCommand, (bool Success, string? Error)>
{
    private readonly IApplicationDbContext _db;

    public UpdateVehicleColorCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<(bool Success, string? Error)> Handle(UpdateVehicleColorCommand cmd, CancellationToken ct)
    {
        var color = await _db.VehicleColors.FirstOrDefaultAsync(c => c.Id == cmd.Id, ct);
        if (color is null) return (false, "Color not found.");
        color.Name = cmd.Name.Trim();
        color.SortOrder = cmd.SortOrder;
        await _db.SaveChangesAsync(ct);
        return (true, null);
    }
}

// ── Delete ────────────────────────────────────────────────────────────────────

public record DeleteVehicleColorCommand(Guid Id) : IRequest<(bool Success, string? Error)>;

public class DeleteVehicleColorCommandHandler : IRequestHandler<DeleteVehicleColorCommand, (bool Success, string? Error)>
{
    private readonly IApplicationDbContext _db;

    public DeleteVehicleColorCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<(bool Success, string? Error)> Handle(DeleteVehicleColorCommand cmd, CancellationToken ct)
    {
        var color = await _db.VehicleColors.FirstOrDefaultAsync(c => c.Id == cmd.Id, ct);
        if (color is null) return (false, "Color not found.");
        _db.VehicleColors.Remove(color);
        await _db.SaveChangesAsync(ct);
        return (true, null);
    }
}
