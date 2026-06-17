namespace RwandaMotor.Domain.Entities;

/// <summary>
/// Singleton entity — always exactly one row (Id = well-known Guid).
/// Stores company contact details and per-document print configuration.
/// </summary>
public class CompanySettings
{
    public static readonly Guid SingletonId = new("00000000-0000-0000-0000-000000000001");

    public Guid Id { get; set; } = SingletonId;

    // ── Company Info ──────────────────────────────────────────
    public string CompanyName { get; set; } = "RwandaMotor";
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? TinNumber { get; set; }
    public string? Website { get; set; }

    // ── Print Toggles ─────────────────────────────────────────
    /// <summary>Show company header block on Job Card prints</summary>
    public bool JobCardShowHeader { get; set; } = true;
    /// <summary>Show footer disclaimer on Job Card prints</summary>
    public bool JobCardShowFooter { get; set; } = true;
    /// <summary>Show company header block on Delivery Note prints</summary>
    public bool DeliveryNoteShowHeader { get; set; } = true;
    /// <summary>Show footer disclaimer on Delivery Note prints</summary>
    public bool DeliveryNoteShowFooter { get; set; } = true;

    // ── Footer / Terms ────────────────────────────────────────
    public string? FooterDisclaimer { get; set; } =
        "RwandaMotor declines all responsibility for materials not listed above.";

    // ── Email Templates ───────────────────────────────────────
    // Job card supports: {CustomerName}
    // Delivery note supports: {CustomerName}, {VehicleModel}
    public string? EmailJobCardMessage { get; set; } =
        "Dear {CustomerName}, your vehicle has been received and a repair order has been opened. Our team will keep you informed of progress.";
    public string? EmailDeliveryNoteMessage { get; set; } =
        "Dear {CustomerName}, thank you for trusting us with your {VehicleModel}. Your vehicle service is now complete and ready for collection. We are glad to have served you.";

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
