using RwandaMotor.Domain.Common;

namespace RwandaMotor.Domain.Entities;

/// <summary>
/// Configurable service interval policy per brand/model/package.
/// Drives all dynamic service due date and mileage calculations.
/// </summary>
public class ServicePolicy : BaseEntity
{
    public Guid? BrandId { get; set; }
    public Guid? ModelId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>Interval in kilometers (e.g. 5000 for Suzuki)</summary>
    public int IntervalKm { get; set; }

    /// <summary>Interval in months as a fallback when mileage is unavailable</summary>
    public int IntervalMonths { get; set; }

    /// <summary>Days before due date to flag as DueSoon</summary>
    public int DueSoonLeadDays { get; set; } = 30;

    /// <summary>KM tolerance before due to flag as DueSoon</summary>
    public int DueSoonLeadKm { get; set; } = 500;

    /// <summary>Months of inactivity beyond interval to classify vehicle as Lost</summary>
    public int LostThresholdMonths { get; set; } = 12;

    public bool IsDefault { get; set; } = false;
    public bool IsActive { get; set; } = true;
    public string? CountryCode { get; set; } = "RW";

    // Navigation
    public Brand? Brand { get; set; }
    public VehicleModel? Model { get; set; }
}
