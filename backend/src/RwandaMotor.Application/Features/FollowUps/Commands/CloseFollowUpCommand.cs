using MediatR;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.FollowUps.Commands;

public record CloseFollowUpCommand(Guid FollowUpId, string? Notes) : IRequest;

public class CloseFollowUpCommandHandler : IRequestHandler<CloseFollowUpCommand>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public CloseFollowUpCommandHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task Handle(CloseFollowUpCommand cmd, CancellationToken ct)
    {
        var followUp = await _db.FollowUps.FindAsync(new object[] { cmd.FollowUpId }, ct)
            ?? throw new InvalidOperationException("Follow-up not found");

        followUp.Status     = FollowUpStatus.Closed;
        followUp.ResolvedAt = DateTime.UtcNow;
        followUp.Notes      = string.IsNullOrWhiteSpace(cmd.Notes) ? followUp.Notes : cmd.Notes;
        followUp.UpdatedAt  = DateTime.UtcNow;
        followUp.UpdatedBy  = _currentUser.UserId;

        await _db.SaveChangesAsync(ct);
    }
}
