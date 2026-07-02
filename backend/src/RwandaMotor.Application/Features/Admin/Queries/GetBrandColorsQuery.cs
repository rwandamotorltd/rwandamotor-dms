using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;

namespace RwandaMotor.Application.Features.Admin.Queries;

public record GetBrandColorsQuery : IRequest<List<BrandColorDto>>;

public record BrandColorDto(Guid Id, string Name, string HexValue, int SortOrder);

public class GetBrandColorsQueryHandler : IRequestHandler<GetBrandColorsQuery, List<BrandColorDto>>
{
    private readonly IApplicationDbContext _db;

    public GetBrandColorsQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<List<BrandColorDto>> Handle(GetBrandColorsQuery request, CancellationToken ct)
    {
        return await _db.BrandColors
            .OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
            .Select(c => new BrandColorDto(c.Id, c.Name, c.HexValue, c.SortOrder))
            .ToListAsync(ct);
    }
}
