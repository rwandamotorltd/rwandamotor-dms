using MediatR;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.Appointments.Commands;

public record UpdateAppointmentCommand(
    Guid AppointmentId,
    DateTime AppointmentDate,
    int DurationMinutes,
    ServiceType ServiceType,
    Guid? TechnicianId,
    string? Notes
) : IRequest;

public class UpdateAppointmentCommandHandler : IRequestHandler<UpdateAppointmentCommand>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public UpdateAppointmentCommandHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task Handle(UpdateAppointmentCommand cmd, CancellationToken ct)
    {
        var appt = await _db.Appointments.FindAsync(new object[] { cmd.AppointmentId }, ct)
            ?? throw new InvalidOperationException("Appointment not found");

        if (appt.Status == AppointmentStatus.Completed || appt.Status == AppointmentStatus.Cancelled)
            throw new InvalidOperationException("Cannot update a completed or cancelled appointment");

        appt.AppointmentDate = cmd.AppointmentDate;
        appt.DurationMinutes = cmd.DurationMinutes > 0 ? cmd.DurationMinutes : appt.DurationMinutes;
        appt.ServiceType     = cmd.ServiceType;
        appt.TechnicianId    = cmd.TechnicianId;
        appt.Notes           = cmd.Notes;
        appt.UpdatedAt       = DateTime.UtcNow;
        appt.UpdatedBy       = _currentUser.UserId;

        await _db.SaveChangesAsync(ct);
    }
}

public record ChangeAppointmentStatusCommand(
    Guid AppointmentId,
    AppointmentStatus NewStatus,
    Guid? CompletedJobCardId = null
) : IRequest;

public class ChangeAppointmentStatusCommandHandler : IRequestHandler<ChangeAppointmentStatusCommand>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public ChangeAppointmentStatusCommandHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task Handle(ChangeAppointmentStatusCommand cmd, CancellationToken ct)
    {
        var appt = await _db.Appointments.FindAsync(new object[] { cmd.AppointmentId }, ct)
            ?? throw new InvalidOperationException("Appointment not found");

        appt.Status    = cmd.NewStatus;
        appt.UpdatedAt = DateTime.UtcNow;
        appt.UpdatedBy = _currentUser.UserId;

        if (cmd.NewStatus == AppointmentStatus.Confirmed)
        {
            appt.ConfirmedAt = DateTime.UtcNow;
            appt.ConfirmedBy = _currentUser.UserId;
        }
        else if (cmd.NewStatus == AppointmentStatus.Completed)
        {
            appt.CompletedAt       = DateTime.UtcNow;
            appt.CompletedJobCardId = cmd.CompletedJobCardId;

            // Mark linked follow-up as Recovered if applicable
            if (appt.FollowUpId.HasValue)
            {
                var followUp = await _db.FollowUps.FindAsync(new object[] { appt.FollowUpId.Value }, ct);
                if (followUp != null)
                {
                    followUp.Status          = FollowUpStatus.Recovered;
                    followUp.RecoveryAchieved = true;
                    followUp.ResolvedAt      = DateTime.UtcNow;
                    followUp.UpdatedAt       = DateTime.UtcNow;
                    followUp.UpdatedBy       = _currentUser.UserId;
                }
            }
        }

        await _db.SaveChangesAsync(ct);
    }
}
