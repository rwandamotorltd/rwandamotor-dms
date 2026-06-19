using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.FollowUps.Queries;

public record GetFollowUpsQuery(
    string?          Reason     = null,
    FollowUpStatus?  Status     = null,
    int              PageNumber = 1,
    int              PageSize   = 30
) : IRequest<List<FollowUpListItemDto>>;

public record FollowUpListItemDto(
    Guid            Id,
    string          VehiclePlate,
    string          VehicleBrand,
    string          VehicleModel,
    int             VehicleYear,
    string          CustomerName,
    string?         CustomerPhone,
    string          Reason,
    FollowUpStatus  Status,
    FollowUpPriority Priority,
    DateTime        DueDate,
    DateTime        CreatedAt,
    int             InteractionCount,
    DateTime?       LastContactDate
);

internal sealed class GetFollowUpsQueryHandler : IRequestHandler<GetFollowUpsQuery, List<FollowUpListItemDto>>
{
    private readonly IApplicationDbContext _db;

    public GetFollowUpsQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<List<FollowUpListItemDto>> Handle(GetFollowUpsQuery request, CancellationToken ct)
    {
        var q = _db.FollowUps
            .Include(f => f.Vehicle).ThenInclude(v => v.Brand)
            .Include(f => f.Vehicle).ThenInclude(v => v.Model)
            .Include(f => f.Customer)
            .Include(f => f.Interactions)
            .AsNoTracking()
            .Where(f => !f.IsDeleted);

        if (!string.IsNullOrEmpty(request.Reason))
            q = q.Where(f => f.Reason == request.Reason);

        if (request.Status.HasValue)
            q = q.Where(f => f.Status == request.Status.Value);

        return await q
            .OrderByDescending(f => f.DueDate)
            .ThenByDescending(f => f.CreatedAt)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(f => new FollowUpListItemDto(
                f.Id,
                f.Vehicle.PlateNumber ?? f.Vehicle.VIN,
                f.Vehicle.Brand != null ? f.Vehicle.Brand.Name : "",
                f.Vehicle.Model != null ? f.Vehicle.Model.Name : "",
                f.Vehicle.Year,
                f.Customer.FullName,
                f.Customer.Phone,
                f.Reason,
                f.Status,
                f.Priority,
                f.DueDate,
                f.CreatedAt,
                f.Interactions.Count,
                f.Interactions.Max(i => (DateTime?)i.CreatedAt)
            ))
            .ToListAsync(ct);
    }
}
