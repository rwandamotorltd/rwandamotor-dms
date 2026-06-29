namespace RwandaMotor.Domain.Entities;

/// <summary>
/// Singleton entity — always exactly one row (Id = well-known Guid).
/// Stores company contact details and per-document print configuration.
/// </summary>
public class CompanySettings
{
    public static readonly Guid SingletonId = new("00000000-0000-0000-0000-000000000001");

    public Guid Id { get; set; } = SingletonId;

    // Company Info
    public string CompanyName { get; set; } = "RwandaMotor";
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? TinNumber { get; set; }
    public string? Website { get; set; }

    // Print Toggles
    public bool JobCardShowHeader { get; set; } = true;
    public bool JobCardShowFooter { get; set; } = true;
    public bool DeliveryNoteShowHeader { get; set; } = true;
    public bool DeliveryNoteShowFooter { get; set; } = true;

    // Footer / Terms
    public string? FooterDisclaimer { get; set; } =
        "RwandaMotor declines all responsibility for materials not listed above.";

    // Email Templates
    // Job card supports: {CustomerName}
    // Delivery note supports: {CustomerName}, {VehicleModel}
    public string? EmailJobCardMessage { get; set; } =
        "Dear {CustomerName}, your vehicle has been received and a repair order has been opened. Our team will keep you informed of progress.";
    public string? EmailDeliveryNoteMessage { get; set; } =
        "Dear {CustomerName}, thank you for trusting RWANDAMOTOR LTD with your {VehicleModel}. It was a pleasure serving you and we hope our service met your expectations. We look forward to welcoming you again.";

    // Service Types Config
    // JSON: [{ "value": "OilChange", "label": "Oil Change", "isActive": true, "isBuiltIn": true }]
    // Null = system defaults apply. Admin-managed via Settings -> Catalogue.
    public string? ServiceTypesConfig { get; set; }

    // PWA orientation: "portrait" | "landscape" | "any"
    public string PwaOrientation { get; set; } = "portrait";

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
