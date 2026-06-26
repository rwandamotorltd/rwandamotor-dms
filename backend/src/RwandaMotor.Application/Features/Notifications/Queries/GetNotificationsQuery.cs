using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.Notifications.Queries;

public record GetNotificationsQuery(int Page = 1, int PageSize = 30) : IRequest<NotificationsResultDto>;

public class GetNotificationsQueryHandler : IRequestHandler<GetNotificationsQuery, NotificationsResultDto>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public GetNotificationsQueryHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<NotificationsResultDto> Handle(GetNotificationsQuery query, CancellationToken ct)
    {
        var userId = _currentUser.UserId;

        var baseQuery = _db.Notifications
            .Where(n => !n.IsDeleted && (n.TargetUserId == null || n.TargetUserId == userId))
            .Where(n => n.VehicleId == null || _db.Vehicles.Any(v => v.Id == n.VehicleId))
            .Where(n => n.FollowUpId == null || _db.FollowUps.Any(f => f.Id == n.FollowUpId))
            .Where(n => n.AppointmentId == null || _db.Appointments.Any(a => a.Id == n.AppointmentId));

        var unreadCount = await baseQuery.CountAsync(n => !n.IsRead, ct);

        var items = await baseQuery
            .OrderByDescending(n => n.CreatedAt)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(n => new NotificationDto(
                n.Id, n.Title, n.Message, n.Type, n.IsRead,
                n.CreatedAt, n.Link, n.VehicleId, n.CustomerId, n.FollowUpId, n.AppointmentId))
            .ToListAsync(ct);

        return new NotificationsResultDto(unreadCount, items);
    }
}

public record NotificationsResultDto(int UnreadCount, List<NotificationDto> Items);

public record NotificationDto(
    Guid Id, string Title, string Message, NotificationType Type,
    bool IsRead, DateTime CreatedAt, string? Link,
    Guid? VehicleId, Guid? CustomerId, Guid? FollowUpId, Guid? AppointmentId);
