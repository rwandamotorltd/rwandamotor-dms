using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Application.Common.Models;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.Vehicles.Queries;

public record GetVehiclesQuery(
    string? Search,
    Guid? BrandId,
    Guid? ModelId,
    RetentionStatus? RetentionStatus,
    bool? IsSoldByDealership,
    bool? WarrantyActive,
    int PageNumber = 1,
    int PageSize = 25
) : IRequest<PaginatedResult<VehicleListItemDto>>;

public class GetVehiclesQueryHandler : IRequestHandler<GetVehiclesQuery, PaginatedResult<VehicleListItemDto>>
{
    private readonly IApplicationDbContext _db;

    public GetVehiclesQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<PaginatedResult<VehicleListItemDto>> Handle(GetVehiclesQuery q, CancellationToken ct)
    {
        var query = _db.Vehicles
            .Include(v => v.Brand)
            .Include(v => v.Model)
            .Include(v => v.Customer)
            .Where(v => !v.IsDeleted);

        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = q.Search.Trim().ToLower();
            query = query.Where(v =>
                v.VIN.ToLower().Contains(s) ||
                (v.PlateNumber != null && v.PlateNumber.ToLower().Contains(s)) ||
                (v.Customer != null && v.Customer.FullName.ToLower().Contains(s)) ||
                v.Brand.Name.ToLower().Contains(s) ||
                v.Model.Name.ToLower().Contains(s));
        }

        if (q.BrandId.HasValue) query = query.Where(v => v.BrandId == q.BrandId);
        if (q.ModelId.HasValue) query = query.Where(v => v.ModelId == q.ModelId);
        if (q.RetentionStatus.HasValue) query = query.Where(v => v.RetentionStatus == q.RetentionStatus);
        if (q.IsSoldByDealership.HasValue) query = query.Where(v => v.IsSoldByDealership == q.IsSoldByDealership);
        if (q.WarrantyActive == true) query = query.Where(v => v.WarrantyEndDate != null && v.WarrantyEndDate > DateTime.UtcNow);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(v => v.CreatedAt)
            .Skip((q.PageNumber - 1) * q.PageSize)
            .Take(q.PageSize)
            .Select(v => new VehicleListItemDto(
                v.Id,
                v.VIN,
                v.PlateNumber,
                v.Brand.Name,
                v.Brand.Code,
                v.Model.Name,
                v.Year,
                v.Customer != null ? v.Customer.FullName : null,
                v.Customer != null ? v.Customer.Phone : null,
                v.SaleDate,
                v.LastServiceDate,
                v.NextServiceDate,
                v.NextServiceMileage,
                v.CurrentMileage,
                v.RetentionStatus,
                v.WarrantyEndDate,
                v.IsSoldByDealership
            ))
            .ToListAsync(ct);

        return PaginatedResult<VehicleListItemDto>.Create(items, total, q.PageNumber, q.PageSize);
    }
}

public record VehicleListItemDto(
    Guid Id,
    string VIN,
    string? PlateNumber,
    string BrandName,
    string BrandCode,
    string ModelName,
    int Year,
    string? CustomerName,
    string? CustomerPhone,
    DateTime? SaleDate,
    DateTime? LastServiceDate,
    DateTime? NextServiceDate,
    int? NextServiceMileage,
    int? CurrentMileage,
    RetentionStatus RetentionStatus,
    DateTime? WarrantyEndDate,
    bool IsSoldByDealership);
