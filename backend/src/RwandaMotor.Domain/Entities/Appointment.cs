using RwandaMotor.Domain.Common;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Domain.Entities;

public class Appointment : BaseEntity
{
    public Guid VehicleId { get; set; }
    public Guid CustomerId { get; set; }
    public Guid? FollowUpId { get; set; }
    public Guid? TechnicianId { get; set; }

    public DateTime AppointmentDate { get; set; }
    public int DurationMinutes { get; set; } = 60;
    public ServiceType ServiceType { get; set; }
    public AppointmentStatus Status { get; set; } = AppointmentStatus.Scheduled;
    public string? Notes { get; set; }

    public DateTime? ConfirmedAt { get; set; }
    public string? ConfirmedBy { get; set; }
    public DateTime? CompletedAt { get; set; }
    public Guid? CompletedJobCardId { get; set; }

    public Vehicle Vehicle { get; set; } = null!;
    public Customer Customer { get; set; } = null!;
    public FollowUp? FollowUp { get; set; }
    public Technician? Technician { get; set; }
}
