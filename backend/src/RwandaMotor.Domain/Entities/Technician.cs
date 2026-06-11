using RwandaMotor.Domain.Common;

namespace RwandaMotor.Domain.Entities;

public class Technician : BaseEntity
{
    public string FullName { get; set; } = string.Empty;
    public string EmployeeCode { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Specialization { get; set; }
    public string? CertificationLevel { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public ICollection<ServiceRecord> ServiceRecords { get; set; } = new List<ServiceRecord>();
}

public class WorkshopBay : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? BayType { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<ServiceRecord> ServiceRecords { get; set; } = new List<ServiceRecord>();
}
