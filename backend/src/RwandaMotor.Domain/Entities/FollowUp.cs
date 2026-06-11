using RwandaMotor.Domain.Common;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Domain.Entities;

public class FollowUp : BaseEntity
{
    public Guid VehicleId { get; set; }
    public Guid CustomerId { get; set; }
    public string? AssignedToUserId { get; set; }

    public FollowUpStatus Status { get; set; } = FollowUpStatus.Pending;
    public FollowUpPriority Priority { get; set; } = FollowUpPriority.Medium;
    public ContactMethod ContactMethod { get; set; } = ContactMethod.Phone;

    public string Reason { get; set; } = string.Empty;
    public string? Notes { get; set; }

    public DateTime DueDate { get; set; }
    public DateTime? ContactedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }

    public bool RecoveryAchieved { get; set; } = false;

    // Navigation
    public Vehicle Vehicle { get; set; } = null!;
    public Customer Customer { get; set; } = null!;
}
