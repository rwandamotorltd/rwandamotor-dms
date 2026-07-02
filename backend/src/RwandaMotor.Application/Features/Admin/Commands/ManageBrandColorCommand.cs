using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Application.Features.Admin.Queries;
using RwandaMotor.Domain.Entities;

namespace RwandaMotor.Application.Features.Admin.Commands;

// ── Create ────────────────────────────────────────────────────────────────────

public record CreateBrandColorCommand(string Name, string HexValue, int SortOrder = 0)
    : IRequest<BrandColorDto>;

public class CreateBrandColorCommandHandler : IRequestHandler<CreateBrandColorCommand, BrandColorDto>
{
    private readonly IApplicationDbContext _db;

    public CreateBrandColorCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<BrandColorDto> Handle(CreateBrandColorCommand cmd, CancellationToken ct)
    {
        var color = new BrandColor
        {
            Id        = Guid.NewGuid(),
            Name      = cmd.Name.Trim(),
            HexValue  = cmd.HexValue.Trim(),
            SortOrder = cmd.SortOrder,
        };
        _db.BrandColors.Add(color);
        await _db.SaveChangesAsync(ct);
        return new BrandColorDto(color.Id, color.Name, color.HexValue, color.SortOrder);
    }
}

// ── Update ────────────────────────────────────────────────────────────────────

public record UpdateBrandColorCommand(Guid Id, string Name, string HexValue, int SortOrder)
    : IRequest<(bool Success, string? Error)>;

public class UpdateBrandColorCommandHandler : IRequestHandler<UpdateBrandColorCommand, (bool Success, string? Error)>
{
    private readonly IApplicationDbContext _db;

    public UpdateBrandColorCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<(bool Success, string? Error)> Handle(UpdateBrandColorCommand cmd, CancellationToken ct)
    {
        var color = await _db.BrandColors.FirstOrDefaultAsync(c => c.Id == cmd.Id, ct);
        if (color is null) return (false, "Color not found.");

        color.Name      = cmd.Name.Trim();
        color.HexValue  = cmd.HexValue.Trim();
        color.SortOrder = cmd.SortOrder;
        await _db.SaveChangesAsync(ct);
        return (true, null);
    }
}

// ── Delete ────────────────────────────────────────────────────────────────────

public record DeleteBrandColorCommand(Guid Id) : IRequest<(bool Success, string? Error)>;

public class DeleteBrandColorCommandHandler : IRequestHandler<DeleteBrandColorCommand, (bool Success, string? Error)>
{
    private readonly IApplicationDbContext _db;

    public DeleteBrandColorCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<(bool Success, string? Error)> Handle(DeleteBrandColorCommand cmd, CancellationToken ct)
    {
        var color = await _db.BrandColors.FirstOrDefaultAsync(c => c.Id == cmd.Id, ct);
        if (color is null) return (false, "Color not found.");

        _db.BrandColors.Remove(color);
        await _db.SaveChangesAsync(ct);
        return (true, null);
    }
}
