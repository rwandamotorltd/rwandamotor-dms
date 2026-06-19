using RwandaMotor.Domain.Common;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Domain.Entities;

public class FollowUpInteraction : BaseEntity
{
    public Guid FollowUpId { get; set; }
    public InteractionOutcome Outcome { get; set; }
    public string? Notes { get; set; }
    public DateTime? NextContactDate { get; set; }
    public string? EmailType { get; set; } // "ServiceReminder" | "SatisfactionCheck"

    public FollowUp FollowUp { get; set; } = null!;
}
