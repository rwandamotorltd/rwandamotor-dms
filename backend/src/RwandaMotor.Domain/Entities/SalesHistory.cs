using RwandaMotor.Domain.Common;

namespace RwandaMotor.Domain.Entities;

/// <summary>
/// Created automatically when a PDI Job Card is converted to a Delivery Note —
/// records the vehicle as a newly sold car in the dealership's sales history.
/// </summary>
public class SalesHistory : BaseEntity
{
    public Guid VehicleId { get; set; }
    public Guid? CustomerId { get; set; }
    public Guid? JobCardId { get; set; }

    public DateTime SaleDate { get; set; }
    public string SaleType { get; set; } = "PDI"; // PDI, Direct, etc.

    // Snapshot
    public string VIN { get; set; } = string.Empty;
    public string? PlateNumber { get; set; }
    public string? CustomerName { get; set; }
    public string? JobCardNumber { get; set; }
    public string? DeliveryNoteNumber { get; set; }

    public string? Notes { get; set; }

    public Vehicle Vehicle { get; set; } = null!;
    public Customer? Customer { get; set; }
}
