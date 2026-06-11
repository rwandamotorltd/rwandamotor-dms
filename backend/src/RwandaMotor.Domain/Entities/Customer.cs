using RwandaMotor.Domain.Common;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Domain.Entities;

public class Customer : BaseEntity
{
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; } = "Rwanda";
    public ContactMethod PreferredContactMethod { get; set; } = ContactMethod.Phone;
    public CustomerCategory Category { get; set; } = CustomerCategory.Retail;
    public string? CompanyName { get; set; }
    public string? TaxId { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public ICollection<Vehicle> Vehicles { get; set; } = new List<Vehicle>();
    public ICollection<FollowUp> FollowUps { get; set; } = new List<FollowUp>();
}
