using RwandaMotor.Domain.Common;

namespace RwandaMotor.Domain.Entities;

public class Brand : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public string? Country { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public ICollection<VehicleModel> Models { get; set; } = new List<VehicleModel>();
    public ICollection<ServicePolicy> ServicePolicies { get; set; } = new List<ServicePolicy>();
}

public class VehicleModel : BaseEntity
{
    public Guid BrandId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Segment { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public Brand Brand { get; set; } = null!;
    public ICollection<ServicePolicy> ServicePolicies { get; set; } = new List<ServicePolicy>();
}
