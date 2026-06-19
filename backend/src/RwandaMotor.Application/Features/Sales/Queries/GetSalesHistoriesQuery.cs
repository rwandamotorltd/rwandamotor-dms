using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Application.Common.Models;

namespace RwandaMotor.Application.Features.Sales.Queries;

public record GetSalesHistoriesQuery(
    string? Search,
    string? SaleType,
    DateTime? DateFrom,
    DateTime? DateTo,
    int PageNumber = 1,
    int PageSize = 25
) : IRequest<PaginatedResult<SalesHistoryListDto>>;

public class GetSalesHistoriesQueryHandler : IRequestHandler<GetSalesHistoriesQuery, PaginatedResult<SalesHistoryListDto>>
{
    private readonly IApplicationDbContext _db;

    public GetSalesHistoriesQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<PaginatedResult<SalesHistoryListDto>> Handle(GetSalesHistoriesQuery q, CancellationToken ct)
    {
        var query = _db.SalesHistories
            .Include(s => s.Vehicle).ThenInclude(v => v.Brand)
            .Include(s => s.Vehicle).ThenInclude(v => v.Model)
            .Include(s => s.Customer)
            .Where(s => !s.IsDeleted)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = q.Search.ToLower();
            query = query.Where(x =>
                x.VIN.ToLower().Contains(s) ||
                (x.PlateNumber != null && x.PlateNumber.ToLower().Contains(s)) ||
                (x.CustomerName != null && x.CustomerName.ToLower().Contains(s)) ||
                (x.JobCardNumber != null && x.JobCardNumber.ToLower().Contains(s)) ||
                (x.DeliveryNoteNumber != null && x.DeliveryNoteNumber.ToLower().Contains(s))
            );
        }

        if (!string.IsNullOrWhiteSpace(q.SaleType))
            query = query.Where(x => x.SaleType == q.SaleType);

        if (q.DateFrom.HasValue)
            query = query.Where(x => x.SaleDate >= q.DateFrom.Value);

        if (q.DateTo.HasValue)
            query = query.Where(x => x.SaleDate <= q.DateTo.Value.AddDays(1));

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(s => s.SaleDate)
            .Skip((q.PageNumber - 1) * q.PageSize)
            .Take(q.PageSize)
            .Select(s => new SalesHistoryListDto(
                s.Id,
                s.SaleDate,
                s.SaleType,
                s.VIN,
                s.PlateNumber,
                s.Vehicle.Brand != null ? s.Vehicle.Brand.Name : "—",
                s.Vehicle.Model != null ? s.Vehicle.Model.Name : "—",
                s.Vehicle.Year,
                s.CustomerName,
                s.Customer != null ? s.Customer.Phone : null,
                s.JobCardNumber,
                s.DeliveryNoteNumber,
                s.JobCardId,
                s.CustomerId,
                s.VehicleId,
                s.Notes,
                s.CreatedAt
            ))
            .ToListAsync(ct);

        return PaginatedResult<SalesHistoryListDto>.Create(items, total, q.PageNumber, q.PageSize);
    }
}

public record SalesHistoryListDto(
    Guid Id,
    DateTime SaleDate,
    string SaleType,
    string VIN,
    string? PlateNumber,
    string BrandName,
    string ModelName,
    int Year,
    string? CustomerName,
    string? CustomerPhone,
    string? JobCardNumber,
    string? DeliveryNoteNumber,
    Guid? JobCardId,
    Guid? CustomerId,
    Guid VehicleId,
    string? Notes,
    DateTime CreatedAt
);
