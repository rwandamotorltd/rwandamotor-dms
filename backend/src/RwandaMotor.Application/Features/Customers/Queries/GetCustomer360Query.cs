using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Application.Features.Vehicles.Queries;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.Customers.Queries;

public record GetCustomer360Query(Guid CustomerId) : IRequest<Customer360Dto?>;

public class GetCustomer360QueryHandler : IRequestHandler<GetCustomer360Query, Customer360Dto?>
{
    private readonly IApplicationDbContext _db;

    public GetCustomer360QueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<Customer360Dto?> Handle(GetCustomer360Query request, CancellationToken ct)
    {
        var customer = await _db.Customers
            .Include(c => c.Vehicles).ThenInclude(v => v.Brand)
            .Include(c => c.Vehicles).ThenInclude(v => v.Model)
            .Include(c => c.Vehicles).ThenInclude(v => v.ServiceRecords)
                .ThenInclude(sr => sr.Technician)
            .Where(c => c.Id == request.CustomerId && !c.IsDeleted)
            .FirstOrDefaultAsync(ct);

        if (customer == null) return null;

        var jobCards = await _db.JobCards
            .Include(j => j.Technician)
            .Where(j => j.CustomerId == request.CustomerId && !j.IsDeleted)
            .OrderByDescending(j => j.CreatedAt)
            .Select(j => new JobCard360Dto(
                j.Id,
                j.JobCardNumber,
                j.VIN,
                j.PlateNumber,
                j.ServiceType,
                j.Status,
                j.Mileage,
                j.TechnicianId,
                j.Technician != null ? j.Technician.FullName : null,
                j.CreatedAt,
                j.ClosedAt,
                j.DeliveryNoteNumber,
                j.Notes
            ))
            .ToListAsync(ct);

        var vehicles = customer.Vehicles
            .Where(v => !v.IsDeleted)
            .OrderByDescending(v => v.SaleDate)
            .Select(v => new CustomerVehicleSummaryDto(
                v.Id,
                v.VIN,
                v.PlateNumber,
                v.Brand?.Name ?? "—",
                v.Model?.Name ?? "—",
                v.Year,
                v.Color,
                v.CurrentMileage,
                v.RetentionStatus,
                v.LastServiceDate,
                v.NextServiceDate,
                v.NextServiceMileage,
                v.WarrantyEndDate
            )).ToList();

        // Flatten service history across all vehicles, newest first
        var serviceHistory = customer.Vehicles
            .Where(v => !v.IsDeleted)
            .SelectMany(v => v.ServiceRecords
                .Where(sr => !sr.IsDeleted)
                .Select(sr => new CustomerServiceHistoryDto(
                    sr.Id,
                    v.VIN,
                    v.PlateNumber,
                    (v.Brand?.Name ?? "—") + " " + (v.Model?.Name ?? "—"),
                    sr.ServiceDate,
                    sr.MileageAtService,
                    sr.ServiceType,
                    sr.Technician?.FullName,
                    sr.InvoiceNumber,
                    sr.TotalCost,
                    sr.IsWarrantyJob
                )))
            .OrderByDescending(s => s.ServiceDate)
            .Take(50)
            .ToList();

        return new Customer360Dto(
            customer.Id,
            customer.FullName,
            customer.Phone,
            customer.Email,
            customer.Address,
            customer.City,
            customer.Country,
            customer.Category,
            customer.PreferredContactMethod,
            customer.CompanyName,
            customer.TaxId,
            customer.Notes,
            customer.IsActive,
            customer.CreatedAt,
            vehicles,
            serviceHistory,
            jobCards
        );
    }
}

public record Customer360Dto(
    Guid Id,
    string FullName,
    string? Phone,
    string? Email,
    string? Address,
    string? City,
    string? Country,
    CustomerCategory Category,
    ContactMethod PreferredContactMethod,
    string? CompanyName,
    string? TaxId,
    string? Notes,
    bool IsActive,
    DateTime CreatedAt,
    List<CustomerVehicleSummaryDto> Vehicles,
    List<CustomerServiceHistoryDto> ServiceHistory,
    List<JobCard360Dto> JobCards
);

public record CustomerVehicleSummaryDto(
    Guid Id,
    string VIN,
    string? PlateNumber,
    string BrandName,
    string ModelName,
    int Year,
    string? Color,
    int? CurrentMileage,
    RetentionStatus RetentionStatus,
    DateTime? LastServiceDate,
    DateTime? NextServiceDate,
    int? NextServiceMileage,
    DateTime? WarrantyEndDate
);

public record CustomerServiceHistoryDto(
    Guid Id,
    string VIN,
    string? PlateNumber,
    string VehicleLabel,
    DateTime ServiceDate,
    int MileageAtService,
    ServiceType ServiceType,
    string? TechnicianName,
    string? InvoiceNumber,
    decimal? TotalCost,
    bool IsWarrantyJob
);
