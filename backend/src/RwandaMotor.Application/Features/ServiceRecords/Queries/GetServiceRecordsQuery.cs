using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Application.Common.Models;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.ServiceRecords.Queries;

public record GetServiceRecordsQuery(
    Guid? VehicleId,
    Guid? CustomerId,
    Guid? TechnicianId,
    Guid? BayId,
    ServiceType? ServiceType,
    DateTime? DateFrom,
    DateTime? DateTo,
    string? Search,
    int PageNumber = 1,
    int PageSize = 25
) : IRequest<PaginatedResult<ServiceRecordListItemDto>>;

public class GetServiceRecordsQueryHandler : IRequestHandler<GetServiceRecordsQuery, PaginatedResult<ServiceRecordListItemDto>>
{
    private readonly IApplicationDbContext _db;

    public GetServiceRecordsQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<PaginatedResult<ServiceRecordListItemDto>> Handle(GetServiceRecordsQuery q, CancellationToken ct)
    {
        var query = _db.ServiceRecords
            .Include(s => s.Vehicle).ThenInclude(v => v.Brand)
            .Include(s => s.Vehicle).ThenInclude(v => v.Model)
            .Include(s => s.Vehicle).ThenInclude(v => v.Customer)
            .Include(s => s.Technician)
            .Include(s => s.Bay)
            .Where(s => !s.IsDeleted);

        if (q.VehicleId.HasValue) query = query.Where(s => s.VehicleId == q.VehicleId);
        if (q.TechnicianId.HasValue) query = query.Where(s => s.TechnicianId == q.TechnicianId);
        if (q.BayId.HasValue) query = query.Where(s => s.BayId == q.BayId);
        if (q.ServiceType.HasValue) query = query.Where(s => s.ServiceType == q.ServiceType);
        if (q.DateFrom.HasValue) query = query.Where(s => s.ServiceDate >= q.DateFrom);
        if (q.DateTo.HasValue) query = query.Where(s => s.ServiceDate <= q.DateTo);
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = q.Search.Trim();
            query = query.Where(r =>
                r.Vehicle.VIN.Contains(s) ||
                (r.Vehicle.PlateNumber != null && r.Vehicle.PlateNumber.Contains(s)) ||
                (r.InvoiceNumber != null && r.InvoiceNumber.Contains(s)));
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(s => s.ServiceDate)
            .Skip((q.PageNumber - 1) * q.PageSize)
            .Take(q.PageSize)
            .Select(s => new ServiceRecordListItemDto(
                s.Id,
                s.Vehicle.VIN,
                s.Vehicle.PlateNumber,
                s.Vehicle.Brand.Name,
                s.Vehicle.Model.Name,
                s.Vehicle.Customer != null ? s.Vehicle.Customer.FullName : null,
                s.ServiceDate,
                s.MileageAtService,
                s.ServiceType,
                s.TechnicianId,
                s.Technician != null ? s.Technician.FullName : null,
                s.Bay != null ? s.Bay.Name : null,
                s.InvoiceNumber,
                s.ServiceDescription,
                s.Notes,
                s.TotalCost,
                s.IsWarrantyJob,
                s.NextServiceDate,
                s.NextServiceMileage
            ))
            .ToListAsync(ct);

        return PaginatedResult<ServiceRecordListItemDto>.Create(items, total, q.PageNumber, q.PageSize);
    }
}

public record ServiceRecordListItemDto(
    Guid Id,
    string VIN,
    string? PlateNumber,
    string BrandName,
    string ModelName,
    string? CustomerName,
    DateTime ServiceDate,
    int MileageAtService,
    ServiceType ServiceType,
    Guid? TechnicianId,
    string? TechnicianName,
    string? BayName,
    string? InvoiceNumber,
    string? ServiceDescription,
    string? Notes,
    decimal? TotalCost,
    bool IsWarrantyJob,
    DateTime? NextServiceDate,
    int? NextServiceMileage);
