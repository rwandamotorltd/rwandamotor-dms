using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;

namespace RwandaMotor.Application.Features.Vehicles.Queries;

public record GetBrandsQuery : IRequest<List<BrandDto>>;

public record BrandDto(Guid Id, string Name, List<VehicleModelDto> Models);
public record VehicleModelDto(Guid Id, string Name);

public class GetBrandsQueryHandler : IRequestHandler<GetBrandsQuery, List<BrandDto>>
{
    private readonly IApplicationDbContext _db;

    public GetBrandsQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<List<BrandDto>> Handle(GetBrandsQuery q, CancellationToken ct)
    {
        return await _db.Brands
            .OrderBy(b => b.Name)
            .Select(b => new BrandDto(
                b.Id,
                b.Name,
                b.Models
                    .OrderBy(m => m.Name)
                    .Select(m => new VehicleModelDto(m.Id, m.Name))
                    .ToList()
            ))
            .ToListAsync(ct);
    }
}
