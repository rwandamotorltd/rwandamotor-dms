using RwandaMotor.Domain.Common;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Domain.Entities;

public class Vehicle : BaseEntity
{
    public string VIN { get; set; } = string.Empty;
    public string? PlateNumber { get; set; }
    public Guid BrandId { get; set; }
    public Guid ModelId { get; set; }
    public int Year { get; set; }
    public string? EngineNumber { get; set; }
    public string? Color { get; set; }
    public string? FuelType { get; set; }
    public string? Transmission { get; set; }
    public int? EngineCapacityCC { get; set; }

    // Ownership
    public Guid? CustomerId { get; set; }
    public DateTime? SaleDate { get; set; }
    public decimal? SalePrice { get; set; }
    public bool IsSoldByDealership { get; set; } = true;

    // Mileage tracking
    public int? CurrentMileage { get; set; }
    public int? LastServiceMileage { get; set; }
    public DateTime? LastServiceDate { get; set; }
    public int? NextServiceMileage { get; set; }
    public DateTime? NextServiceDate { get; set; }

    // Warranty
    public DateTime? WarrantyStartDate { get; set; }
    public DateTime? WarrantyEndDate { get; set; }
    public int? WarrantyKmLimit { get; set; }

    // Policy link — resolved dynamically; can be overridden per vehicle
    public Guid? ServicePolicyId { get; set; }

    // Retention
    public RetentionStatus RetentionStatus { get; set; } = RetentionStatus.Active;
    public DateTime? RetentionStatusUpdatedAt { get; set; }

    public string? Notes { get; set; }

    // Navigation
    public Brand Brand { get; set; } = null!;
    public VehicleModel Model { get; set; } = null!;
    public Customer? Customer { get; set; }
    public ServicePolicy? ServicePolicy { get; set; }
    public ICollection<ServiceRecord> ServiceRecords { get; set; } = new List<ServiceRecord>();
    public ICollection<FollowUp> FollowUps { get; set; } = new List<FollowUp>();
}
