using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;

namespace RwandaMotor.Application.Features.Admin.Queries;

public record GetCatalogueBrandsQuery : IRequest<List<CatalogueBrandDto>>;

public record CatalogueBrandDto(
    Guid Id, string Name, string Code, string? Country, bool IsActive,
    List<CatalogueModelDto> Models);

public record CatalogueModelDto(
    Guid Id, string Name, string Code, string? Segment, bool IsActive);

public class GetCatalogueBrandsQueryHandler : IRequestHandler<GetCatalogueBrandsQuery, List<CatalogueBrandDto>>
{
    private readonly IApplicationDbContext _db;
    public GetCatalogueBrandsQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<List<CatalogueBrandDto>> Handle(GetCatalogueBrandsQuery q, CancellationToken ct)
        => await _db.Brands
            .Where(b => !b.IsDeleted)
            .OrderBy(b => b.Name)
            .Select(b => new CatalogueBrandDto(
                b.Id, b.Name, b.Code, b.Country, b.IsActive,
                b.Models
                    .Where(m => !m.IsDeleted)
                    .OrderBy(m => m.Name)
                    .Select(m => new CatalogueModelDto(m.Id, m.Name, m.Code, m.Segment, m.IsActive))
                    .ToList()
            ))
            .ToListAsync(ct);
}
