using RwandaMotor.Domain.Common;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Domain.Entities;

public class JobCard : BaseEntity
{
    // Auto-generated number: OR + YY + 00001  (e.g. OR2600001)
    public string JobCardNumber { get; set; } = string.Empty;

    // Vehicle & customer (denormalised snapshot for printing even after edits)
    public Guid VehicleId { get; set; }
    public Guid? CustomerId { get; set; }
    public Guid? TechnicianId { get; set; }

    // Vehicle snapshot (filled on creation)
    public string VIN { get; set; } = string.Empty;
    public string? PlateNumber { get; set; }
    public int Year { get; set; }
    public string? Color { get; set; }
    public string? Transmission { get; set; }
    public string? FuelType { get; set; }
    public FuelLevel FuelLevel { get; set; } = FuelLevel.Half;
    public int Mileage { get; set; }

    // Customer snapshot
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }

    // Service
    public ServiceType ServiceType { get; set; }
    public string? Notes { get; set; }
    public string? AdditionalInfo { get; set; }

    // Accessories (JSON list of names that are PRESENT)
    // e.g. ["Jack","Spare Tyre","Fire Extinguisher"]
    public List<string> AccessoriesPresent { get; set; } = new();

    // Status
    public JobCardStatus Status { get; set; } = JobCardStatus.Open;

    // Signature — auto-filled with logged-in user on creation
    public string? ReceivedByUserId { get; set; }
    public string ReceivedByName { get; set; } = string.Empty;

    // Closed / Delivery Note
    public DateTime? ClosedAt { get; set; }
    public string? ClosedByUserId { get; set; }
    public string? ClosedByName { get; set; }
    public string? DeliveryNoteNumber { get; set; }
    public DateTime? DeliveryNoteGeneratedAt { get; set; }

    // Navigation
    public Vehicle Vehicle { get; set; } = null!;
    public Customer? Customer { get; set; }
    public Technician? Technician { get; set; }
}
