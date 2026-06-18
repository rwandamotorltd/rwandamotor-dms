using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Entities;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.FollowUps.Commands;

public record LogFollowUpInteractionCommand(
    Guid FollowUpId,
    InteractionOutcome Outcome,
    string? Notes,
    DateTime? NextContactDate
) : IRequest;

public class LogFollowUpInteractionCommandHandler : IRequestHandler<LogFollowUpInteractionCommand>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public LogFollowUpInteractionCommandHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task Handle(LogFollowUpInteractionCommand cmd, CancellationToken ct)
    {
        var followUp = await _db.FollowUps.FindAsync(new object[] { cmd.FollowUpId }, ct)
            ?? throw new InvalidOperationException("Follow-up not found");

        _db.FollowUpInteractions.Add(new FollowUpInteraction
        {
            FollowUpId      = cmd.FollowUpId,
            Outcome         = cmd.Outcome,
            Notes           = cmd.Notes,
            NextContactDate = cmd.NextContactDate,
            CreatedBy       = _currentUser.UserId
        });

        // Update follow-up status based on outcome
        followUp.Status = cmd.Outcome switch
        {
            InteractionOutcome.Reached           => FollowUpStatus.InProgress,
            InteractionOutcome.NoAnswer          => FollowUpStatus.InProgress,
            InteractionOutcome.LeftMessage       => FollowUpStatus.InProgress,
            InteractionOutcome.CallbackScheduled => FollowUpStatus.CallbackScheduled,
            InteractionOutcome.AppointmentBooked => FollowUpStatus.AppointmentBooked,
            _                                    => followUp.Status
        };

        if (cmd.NextContactDate.HasValue)
            followUp.DueDate = cmd.NextContactDate.Value;

        followUp.UpdatedAt = DateTime.UtcNow;
        followUp.UpdatedBy = _currentUser.UserId;

        await _db.SaveChangesAsync(ct);
    }
}
