using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;

namespace RwandaMotor.Application.Features.Admin.Queries;

public record GetVehicleColorsQuery : IRequest<List<VehicleColorDto>>;

public record VehicleColorDto(Guid Id, string Name, int SortOrder);

public class GetVehicleColorsQueryHandler : IRequestHandler<GetVehicleColorsQuery, List<VehicleColorDto>>
{
    private readonly IApplicationDbContext _db;

    public GetVehicleColorsQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<List<VehicleColorDto>> Handle(GetVehicleColorsQuery _, CancellationToken ct) =>
        await _db.VehicleColors
            .OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
            .Select(c => new VehicleColorDto(c.Id, c.Name, c.SortOrder))
            .ToListAsync(ct);
}
