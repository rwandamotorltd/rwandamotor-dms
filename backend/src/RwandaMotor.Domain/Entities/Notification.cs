using RwandaMotor.Domain.Common;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Domain.Entities;

public class Notification : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public NotificationType Type { get; set; }

    // null = broadcast to all users; set to a specific userId to target one person
    public string? TargetUserId { get; set; }

    public Guid? VehicleId { get; set; }
    public Guid? CustomerId { get; set; }
    public Guid? FollowUpId { get; set; }
    public Guid? AppointmentId { get; set; }

    public bool IsRead { get; set; } = false;
    public DateTime? ReadAt { get; set; }

    // Frontend route to navigate to on click (e.g. /follow-ups/abc-123)
    public string? Link { get; set; }

    public Vehicle? Vehicle { get; set; }
    public Customer? Customer { get; set; }
    public FollowUp? FollowUp { get; set; }
    public Appointment? Appointment { get; set; }
}
