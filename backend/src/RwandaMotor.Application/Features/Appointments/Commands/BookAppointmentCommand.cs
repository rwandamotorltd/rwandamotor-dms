using MediatR;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Entities;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.Appointments.Commands;

public record BookAppointmentCommand(
    Guid VehicleId,
    Guid CustomerId,
    Guid? FollowUpId,
    Guid? TechnicianId,
    DateTime AppointmentDate,
    int DurationMinutes,
    ServiceType ServiceType,
    string? Notes
) : IRequest<Guid>;

public class BookAppointmentCommandHandler : IRequestHandler<BookAppointmentCommand, Guid>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public BookAppointmentCommandHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Guid> Handle(BookAppointmentCommand cmd, CancellationToken ct)
    {
        var appointment = new Appointment
        {
            VehicleId       = cmd.VehicleId,
            CustomerId      = cmd.CustomerId,
            FollowUpId      = cmd.FollowUpId,
            TechnicianId    = cmd.TechnicianId,
            AppointmentDate = cmd.AppointmentDate,
            DurationMinutes = cmd.DurationMinutes > 0 ? cmd.DurationMinutes : 60,
            ServiceType     = cmd.ServiceType,
            Status          = AppointmentStatus.Scheduled,
            Notes           = cmd.Notes,
            CreatedBy       = _currentUser.UserId
        };
        _db.Appointments.Add(appointment);

        // If booked from a follow-up, log the interaction and update status
        if (cmd.FollowUpId.HasValue)
        {
            var followUp = await _db.FollowUps.FindAsync(new object[] { cmd.FollowUpId.Value }, ct);
            if (followUp != null)
            {
                _db.FollowUpInteractions.Add(new FollowUpInteraction
                {
                    FollowUpId = cmd.FollowUpId.Value,
                    Outcome    = InteractionOutcome.AppointmentBooked,
                    Notes      = $"Appointment booked for {cmd.AppointmentDate:dd MMM yyyy HH:mm}",
                    CreatedBy  = _currentUser.UserId
                });
                followUp.Status    = FollowUpStatus.AppointmentBooked;
                followUp.UpdatedAt = DateTime.UtcNow;
                followUp.UpdatedBy = _currentUser.UserId;
            }
        }

        // In-app notification
        _db.Notifications.Add(new Notification
        {
            Title        = "Appointment Booked",
            Message      = $"Service appointment scheduled for {cmd.AppointmentDate:dd MMM yyyy 'at' HH:mm}.",
            Type         = NotificationType.AppointmentConfirmed,
            VehicleId    = cmd.VehicleId,
            CustomerId   = cmd.CustomerId,
            FollowUpId   = cmd.FollowUpId,
            Link         = "/appointments",
            CreatedBy    = _currentUser.UserId
        });

        await _db.SaveChangesAsync(ct);
        return appointment.Id;
    }
}
