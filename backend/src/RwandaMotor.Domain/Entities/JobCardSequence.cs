using RwandaMotor.Domain.Common;

namespace RwandaMotor.Domain.Entities;

/// <summary>
/// Tracks the auto-increment sequence per calendar year.
/// Number format: OR + YY + 5-digit sequence  → OR2600001
/// Admin can override StartingSequence before any card is issued for that year.
/// </summary>
public class JobCardSequence : BaseEntity
{
    public int Year { get; set; }
    public int CurrentSequence { get; set; } = 0;
    public int StartingSequence { get; set; } = 1;
}
