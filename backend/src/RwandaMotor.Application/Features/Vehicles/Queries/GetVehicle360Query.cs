using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.Vehicles.Queries;

public record GetVehicle360Query(Guid VehicleId) : IRequest<Vehicle360Dto?>;

public class GetVehicle360QueryHandler : IRequestHandler<GetVehicle360Query, Vehicle360Dto?>
{
    private readonly IApplicationDbContext _db;

    public GetVehicle360QueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<Vehicle360Dto?> Handle(GetVehicle360Query request, CancellationToken ct)
    {
        var vehicle = await _db.Vehicles
            .Include(v => v.Brand)
            .Include(v => v.Model)
            .Include(v => v.Customer)
            .Include(v => v.ServicePolicy)
            .Include(v => v.ServiceRecords)
                .ThenInclude(sr => sr.Technician)
            .Include(v => v.ServiceRecords)
                .ThenInclude(sr => sr.Parts)
            .Include(v => v.FollowUps)
            .Where(v => v.Id == request.VehicleId && !v.IsDeleted)
            .FirstOrDefaultAsync(ct);

        if (vehicle == null) return null;

        var serviceTimeline = vehicle.ServiceRecords
            .Where(sr => !sr.IsDeleted)
            .OrderByDescending(sr => sr.ServiceDate)
            .Select(sr => new ServiceTimelineItemDto(
                sr.Id,
                sr.ServiceDate,
                sr.ServiceType,
                sr.MileageAtService,
                sr.Technician?.FullName,
                sr.InvoiceNumber,
                sr.TotalCost,
                sr.IsWarrantyJob,
                sr.Notes,
                sr.ServiceDescription,
                sr.Parts.Select(p => new ServicePartDto(p.PartNumber, p.PartName, p.Quantity, p.UnitPrice, p.TotalPrice)).ToList()
            )).ToList();

        var followUpHistory = vehicle.FollowUps
            .Where(f => !f.IsDeleted)
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => new FollowUpHistoryDto(
                f.Id,
                f.Status,
                f.Priority,
                f.ContactMethod,
                f.Reason,
                f.DueDate,
                f.ContactedAt,
                f.Notes,
                f.RecoveryAchieved
            )).ToList();

        var technicianHistory = vehicle.ServiceRecords
            .Where(sr => !sr.IsDeleted && sr.TechnicianId.HasValue)
            .GroupBy(sr => new { sr.TechnicianId, sr.Technician?.FullName })
            .Select(g => new TechnicianHistoryDto(g.Key.TechnicianId!.Value, g.Key.FullName ?? "", g.Count()))
            .OrderByDescending(t => t.VisitCount)
            .ToList();

        var kpis = new Vehicle360KpisDto(
            TotalServices: vehicle.ServiceRecords.Count(sr => !sr.IsDeleted),
            TotalRevenue: vehicle.ServiceRecords.Where(sr => !sr.IsDeleted).Sum(sr => sr.TotalCost ?? 0),
            AverageServiceIntervalDays: CalculateAvgServiceInterval(vehicle.ServiceRecords.Where(sr => !sr.IsDeleted).ToList()),
            WarrantyJobCount: vehicle.ServiceRecords.Count(sr => !sr.IsDeleted && sr.IsWarrantyJob),
            LastServiceDaysAgo: vehicle.LastServiceDate.HasValue ? (int)(DateTime.UtcNow - vehicle.LastServiceDate.Value).TotalDays : null
        );

        return new Vehicle360Dto(
            Id: vehicle.Id,
            VIN: vehicle.VIN,
            PlateNumber: vehicle.PlateNumber,
            BrandName: vehicle.Brand.Name,
            ModelName: vehicle.Model.Name,
            Year: vehicle.Year,
            Color: vehicle.Color,
            FuelType: vehicle.FuelType,
            EngineNumber: vehicle.EngineNumber,
            CustomerName: vehicle.Customer?.FullName,
            CustomerPhone: vehicle.Customer?.Phone,
            CustomerEmail: vehicle.Customer?.Email,
            CustomerCategory: vehicle.Customer?.Category,
            SaleDate: vehicle.SaleDate,
            SalePrice: vehicle.SalePrice,
            IsSoldByDealership: vehicle.IsSoldByDealership,
            CurrentMileage: vehicle.CurrentMileage,
            LastServiceDate: vehicle.LastServiceDate,
            LastServiceMileage: vehicle.LastServiceMileage,
            NextServiceDate: vehicle.NextServiceDate,
            NextServiceMileage: vehicle.NextServiceMileage,
            WarrantyStartDate: vehicle.WarrantyStartDate,
            WarrantyEndDate: vehicle.WarrantyEndDate,
            WarrantyKmLimit: vehicle.WarrantyKmLimit,
            RetentionStatus: vehicle.RetentionStatus,
            ServicePolicyId: vehicle.ServicePolicyId,
            ServicePolicyName: vehicle.ServicePolicy?.Name,
            Transmission: vehicle.Transmission,
            EngineCapacityCC: vehicle.EngineCapacityCC,
            ServiceTimeline: serviceTimeline,
            FollowUpHistory: followUpHistory,
            TechnicianHistory: technicianHistory,
            Kpis: kpis
        );
    }

    private static double? CalculateAvgServiceInterval(List<Domain.Entities.ServiceRecord> records)
    {
        if (records.Count < 2) return null;
        var sorted = records.OrderBy(r => r.ServiceDate).ToList();
        var intervals = sorted.Zip(sorted.Skip(1), (a, b) => (b.ServiceDate - a.ServiceDate).TotalDays).ToList();
        return intervals.Count > 0 ? intervals.Average() : null;
    }
}

public record Vehicle360Dto(
    Guid Id, string VIN, string? PlateNumber,
    string BrandName, string ModelName, int Year,
    string? Color, string? FuelType, string? EngineNumber,
    string? CustomerName, string? CustomerPhone, string? CustomerEmail,
    CustomerCategory? CustomerCategory,
    DateTime? SaleDate, decimal? SalePrice, bool IsSoldByDealership,
    int? CurrentMileage, DateTime? LastServiceDate, int? LastServiceMileage,
    DateTime? NextServiceDate, int? NextServiceMileage,
    DateTime? WarrantyStartDate, DateTime? WarrantyEndDate, int? WarrantyKmLimit,
    RetentionStatus RetentionStatus, Guid? ServicePolicyId, string? ServicePolicyName,
    string? Transmission, int? EngineCapacityCC,
    List<ServiceTimelineItemDto> ServiceTimeline,
    List<FollowUpHistoryDto> FollowUpHistory,
    List<TechnicianHistoryDto> TechnicianHistory,
    Vehicle360KpisDto Kpis);

public record ServiceTimelineItemDto(
    Guid Id, DateTime ServiceDate, ServiceType ServiceType,
    int Mileage, string? TechnicianName, string? InvoiceNumber,
    decimal? TotalCost, bool IsWarrantyJob, string? Notes,
    string? ServiceDescription, List<ServicePartDto> Parts);

public record ServicePartDto(string PartNumber, string PartName, int Quantity, decimal UnitPrice, decimal TotalPrice);

public record FollowUpHistoryDto(
    Guid Id, FollowUpStatus Status, FollowUpPriority Priority,
    ContactMethod ContactMethod, string Reason, DateTime DueDate,
    DateTime? ContactedAt, string? Notes, bool RecoveryAchieved);

public record TechnicianHistoryDto(Guid TechnicianId, string TechnicianName, int VisitCount);

public record Vehicle360KpisDto(
    int TotalServices, decimal TotalRevenue,
    double? AverageSe