using MediatR;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Entities;

namespace RwandaMotor.Application.Features.Admin.Commands;

// ── Brands ──────────────────────────────────────────────────────────────────

public record CreateBrandCommand(string Name, string Code, string? Country) : IRequest<Guid>;

public class CreateBrandCommandHandler : IRequestHandler<CreateBrandCommand, Guid>
{
    private readonly IApplicationDbContext _db;
    public CreateBrandCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<Guid> Handle(CreateBrandCommand cmd, CancellationToken ct)
    {
        var brand = new Brand
        {
            Name     = cmd.Name.Trim(),
            Code     = cmd.Code.Trim().ToUpperInvariant(),
            Country  = cmd.Country?.Trim(),
            IsActive = true,
        };
        _db.Brands.Add(brand);
        await _db.SaveChangesAsync(ct);
        return brand.Id;
    }
}

public record UpdateBrandCommand(Guid Id, string Name, string Code, string? Country, bool IsActive) : IRequest<bool>;

public class UpdateBrandCommandHandler : IRequestHandler<UpdateBrandCommand, bool>
{
    private readonly IApplicationDbContext _db;
    public UpdateBrandCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<bool> Handle(UpdateBrandCommand cmd, CancellationToken ct)
    {
        var brand = await _db.Brands.FindAsync(new object[] { cmd.Id }, ct);
        if (brand == null) return false;
        brand.Name     = cmd.Name.Trim();
        brand.Code     = cmd.Code.Trim().ToUpperInvariant();
        brand.Country  = cmd.Country?.Trim();
        brand.IsActive = cmd.IsActive;
        await _db.SaveChangesAsync(ct);
        return true;
    }
}

public record DeleteBrandCommand(Guid Id) : IRequest<bool>;

public class DeleteBrandCommandHandler : IRequestHandler<DeleteBrandCommand, bool>
{
    private readonly IApplicationDbContext _db;
    public DeleteBrandCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<bool> Handle(DeleteBrandCommand cmd, CancellationToken ct)
    {
        var brand = await _db.Brands.FindAsync(new object[] { cmd.Id }, ct);
        if (brand == null) return false;
        brand.IsDeleted = true;
        await _db.SaveChangesAsync(ct);
        return true;
    }
}

// ── Models ───────────────────────────────────────────────────────────────────

public record CreateVehicleModelCommand(Guid BrandId, string Name, string Code, string? Segment) : IRequest<Guid>;

public class CreateVehicleModelCommandHandler : IRequestHandler<CreateVehicleModelCommand, Guid>
{
    private readonly IApplicationDbContext _db;
    public CreateVehicleModelCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<Guid> Handle(CreateVehicleModelCommand cmd, CancellationToken ct)
    {
        var model = new VehicleModel
        {
            BrandId  = cmd.BrandId,
            Name     = cmd.Name.Trim(),
            Code     = cmd.Code.Trim().ToUpperInvariant(),
            Segment  = cmd.Segment?.Trim(),
            IsActive = true,
        };
        _db.VehicleModels.Add(model);
        await _db.SaveChangesAsync(ct);
        return model.Id;
    }
}

public record UpdateVehicleModelCommand(Guid Id, string Name, string Code, string? Segment, bool IsActive) : IRequest<bool>;

public class UpdateVehicleModelCommandHandler : IRequestHandler<UpdateVehicleModelCommand, bool>
{
    private readonly IApplicationDbContext _db;
    public UpdateVehicleModelCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<bool> Handle(UpdateVehicleModelCommand cmd, CancellationToken ct)
    {
        var model = await _db.VehicleModels.FindAsync(new object[] { cmd.Id }, ct);
        if (model == null) return false;
        model.Name     = cmd.Name.Trim();
        model.Code     = cmd.Code.Trim().ToUpperInvariant();
        model.Segment  = cmd.Segment?.Trim();
        model.IsActive = cmd.IsActive;
        await _db.SaveChangesAsync(ct);
        return true;
    }
}

public record DeleteVehicleModelCommand(Guid Id) : IRequest<bool>;

public class DeleteVehicleModelCommandHandler : IRequestHandler<DeleteVehicleModelCommand, bool>
{
    private readonly IApplicationDbContext _db;
    public DeleteVehicleModelCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<bool> Handle(DeleteVehicleModelCommand cmd, CancellationToken ct)
    {
        var model = await _db.VehicleModels.FindAsync(new object[] { cmd.Id }, ct);
        if (model == null) return false;
        model.IsDeleted = true;
        await _db.SaveChangesAsync(ct);
        return true;
    }
}
