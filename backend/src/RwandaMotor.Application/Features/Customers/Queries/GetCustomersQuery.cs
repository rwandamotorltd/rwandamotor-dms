using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Application.Common.Models;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.Customers.Queries;

public record GetCustomersQuery(
    string? Search,
    CustomerCategory? Category,
    int PageNumber = 1,
    int PageSize = 25
) : IRequest<PaginatedResult<CustomerListItemDto>>;

public class GetCustomersQueryHandler : IRequestHandler<GetCustomersQuery, PaginatedResult<CustomerListItemDto>>
{
    private readonly IApplicationDbContext _db;

    public GetCustomersQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<PaginatedResult<CustomerListItemDto>> Handle(GetCustomersQuery q, CancellationToken ct)
    {
        var query = _db.Customers.Where(c => !c.IsDeleted);

        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = q.Search.ToLower();
            query = query.Where(c =>
                c.FullName.ToLower().Contains(s) ||
                (c.Phone != null && c.Phone.Contains(s)) ||
                (c.Email != null && c.Email.ToLower().Contains(s)));
        }
        if (q.Category.HasValue) query = query.Where(c => c.Category == q.Category);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(c => c.FullName)
            .Skip((q.PageNumber - 1) * q.PageSize)
            .Take(q.PageSize)
            .Select(c => new CustomerListItemDto(
                c.Id,
                c.FullName,
                c.Phone,
                c.Email,
                c.Category,
                c.CompanyName,
                c.City,
                c.Address,
                c.Vehicles.Count(v => !v.IsDeleted),
                c.Vehicles.Max(v => (DateTime?)v.LastServiceDate),
                c.IsActive
            ))
            .ToListAsync(ct);

        return PaginatedResult<CustomerListItemDto>.Create(items, total, q.PageNumber, q.PageSize);
    }
}

public record CustomerListItemDto(
    Guid Id,
    string FullName,
    string? Phone,
    string? Email,
    CustomerCategory Category,
    string? CompanyName,
    string? City,
    string? Address,
    int VehicleCount,
    DateTime? LastServiceDate,
    bool IsActive);
