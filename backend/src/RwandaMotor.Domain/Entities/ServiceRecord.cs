using RwandaMotor.Domain.Common;

namespace RwandaMotor.Domain.Entities;

public class ServiceRecord : BaseEntity
{
    public Guid VehicleId { get; set; }
    public Guid? TechnicianId { get; set; }
    public Guid? BayId { get; set; }

    public DateTime ServiceDate { get; set; }
    public int MileageAtService { get; set; }
    public string ServiceType { get; set; } = string.Empty;
    public string? ServiceDescription { get; set; }

    public string? InvoiceNumber { get; set; }
    public decimal? LaborCost { get; set; }
    public decimal? PartsCost { get; set; }
    public decimal? TotalCost { get; set; }

    // Calculated next service
    public int? NextServiceMileage { get; set; }
    public DateTime? NextServiceDate { get; set; }

    public string? Notes { get; set; }
    public bool IsWarrantyJob { get; set; } = false;
    public bool IsRecallJob { get; set; } = false;

    // Navigation
    public Vehicle Vehicle { get; set; } = null!;
    public Technician? Technician { get; set; }
    public WorkshopBay? Bay { get; set; }
    public ICollection<ServicePart> Parts { get; set; } = new List<ServicePart>();
}

public class ServicePart : BaseEntity
{
    public Guid ServiceRecordId { get; set; }
    public string PartNumber { get; set; } = string.Empty;
    public string PartName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }

    public ServiceRecord ServiceRecord { get; set; } = null!;
}
