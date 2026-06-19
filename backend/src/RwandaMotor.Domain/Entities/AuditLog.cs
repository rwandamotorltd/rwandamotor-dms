namespace RwandaMotor.Domain.Entities;

/// <summary>Immutable record of a user-initiated change. Not a BaseEntity — never soft-deleted or audited itself.</summary>
public class AuditLog
{
    public long Id { get; set; }

    public string UserId    { get; set; } = "";
    public string UserEmail { get; set; } = "";
    public string UserName  { get; set; } = "";

    /// <summary>"Created" | "Updated" | "Deleted" | "Login"</summary>
    public string Action { get; set; } = "";

    /// <summary>Simple class name: "Vehicle", "Customer", "JobCard" …</summary>
    public string EntityType { get; set; } = "";
    public string? EntityId  { get; set; }

    /// <summary>Optional short label derived from the entity (e.g. VIN, plate, job card number).</summary>
    public string? EntityLabel { get; set; }

    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
}
