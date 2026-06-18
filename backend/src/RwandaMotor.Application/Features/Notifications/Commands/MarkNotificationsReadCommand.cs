using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;

namespace RwandaMotor.Application.Features.Notifications.Commands;

/// <summary>Mark specific notifications (or all unread for current user) as read.</summary>
public record MarkNotificationsReadCommand(List<Guid>? NotificationIds = null) : IRequest;

public class MarkNotificationsReadCommandHandler : IRequestHandler<MarkNotificationsReadCommand>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public MarkNotificationsReadCommandHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task Handle(MarkNotificationsReadCommand cmd, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var userId = _currentUser.UserId;

        var query = _db.Notifications
            .Where(n => !n.IsDeleted && !n.IsRead
                && (n.TargetUserId == null || n.TargetUserId == userId));

        if (cmd.NotificationIds?.Count > 0)
            query = query.Where(n => cmd.NotificationIds.Contains(n.Id));

        var items = await query.ToListAsync(ct);
        foreach (var n in items)
        {
            n.IsRead  = true;
            n.ReadAt  = now;
            n.UpdatedAt = now;
            n.UpdatedBy = userId;
        }

        if (items.Count > 0)
            await _db.SaveChangesAsync(ct);
    }
}
