using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Application.Common.Models;

namespace RwandaMotor.Application.Features.Activity.Queries;

public record GetActivityLogQuery(
    string? UserId,
    string? EntityType,
    string? Action,
    DateTime? DateFrom,
    DateTime? DateTo,
    int PageNumber = 1,
    int PageSize   = 50
) : IRequest<PaginatedResult<ActivityLogDto>>;

public record ActivityLogDto(
    long     Id,
    string   UserId,
    string   UserEmail,
    string   UserName,
    string   Action,
    string   EntityType,
    string?  EntityId,
    string?  EntityLabel,
    DateTime OccurredAt
);

public class GetActivityLogQueryHandler : IRequestHandler<GetActivityLogQuery, PaginatedResult<ActivityLogDto>>
{
    private readonly IApplicationDbContext _db;
    public GetActivityLogQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<PaginatedResult<ActivityLogDto>> Handle(GetActivityLogQuery req, CancellationToken ct)
    {
        var q = _db.AuditLogs.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(req.UserId))
            q = q.Where(x => x.UserId == req.UserId);
        if (!string.IsNullOrWhiteSpace(req.EntityType))
            q = q.Where(x => x.EntityType == req.EntityType);
        if (!string.IsNullOrWhiteSpace(req.Action))
            q = q.Where(x => x.Action == req.Action);
        if (req.DateFrom.HasValue)
            q = q.Where(x => x.OccurredAt >= req.DateFrom.Value);
        if (req.DateTo.HasValue)
            q = q.Where(x => x.OccurredAt <= req.DateTo.Value);

        var total = await q.CountAsync(ct);

        var items = await q
            .OrderByDescending(x => x.OccurredAt)
            .Skip((req.PageNumber - 1) * req.PageSize)
            .Take(req.PageSize)
            .Select(x => new ActivityLogDto(
                x.Id, x.UserId, x.UserEmail, x.UserName,
                x.Action, x.EntityType, x.EntityId, x.EntityLabel, x.OccurredAt))
            .ToListAsync(ct);

        return PaginatedResult<ActivityLogDto>.Create(items, total, req.PageNumber, req.PageSize);
    }
}
