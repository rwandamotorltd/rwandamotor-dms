using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Application.Common.Models;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.JobCards.Queries;

public record GetJobCardsQuery(
    string? Search,
    JobCardStatus? Status,
    string? ServiceType,
    DateTime? DateFrom,
    DateTime? DateTo,
    int PageNumber = 1,
    int PageSize = 25
) : IRequest<PaginatedResult<JobCardListItemDto>>;

public class GetJobCardsQueryHandler : IRequestHandler<GetJobCardsQuery, PaginatedResult<JobCardListItemDto>>
{
    private readonly IApplicationDbContext _db;

    public GetJobCardsQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<PaginatedResult<JobCardListItemDto>> Handle(GetJobCardsQuery q, CancellationToken ct)
    {
        var query = _db.JobCards
            .Include(j => j.Technician)
            .Where(j => !j.IsDeleted);

        if (q.Status.HasValue)
            query = query.Where(j => j.Status == q.Status.Value);
        if (!string.IsNullOrWhiteSpace(q.ServiceType))
            query = query.Where(j => j.ServiceType == q.ServiceType);
        if (q.DateFrom.HasValue)
            query = query.Where(j => j.CreatedAt >= q.DateFrom.Value);
        if (q.DateTo.HasValue)
            query = query.Where(j => j.CreatedAt <= q.DateTo.Value);
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = q.Search.Trim();
            query = query.Where(j =>
                j.JobCardNumber.Contains(s) ||
                j.VIN.Contains(s) ||
                (j.PlateNumber != null && j.PlateNumber.Contains(s)) ||
                (j.CustomerName != null && j.CustomerName.Contains(s)) ||
                (j.DeliveryNoteNumber != null && j.DeliveryNoteNumber.Contains(s)));
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(j => j.CreatedAt)
            .Skip((q.PageNumber - 1) * q.PageSize)
            .Take(q.PageSize)
            .Select(j => new JobCardListItemDto(
                j.Id,
                j.JobCardNumber,
                j.VIN,
                j.PlateNumber,
                j.Year,
                j.CustomerName,
                j.CustomerPhone ?? j.Customer!.Phone,
                j.ServiceType,
                j.Status,
                j.FuelLevel,
                j.Mileage,
                j.ReceivedByName,
                j.Technician != null ? j.Technician.FullName : null,
                j.CreatedAt,
                j.ClosedAt,
                j.DeliveryNoteNumber
            ))
            .ToListAsync(ct);

        return PaginatedResult<JobCardListItemDto>.Create(items, total, q.PageNumber, q.PageSize);
    }
}

public record JobCardListItemDto(
    Guid Id,
    string JobCardNumber,
    string VIN,
    string? PlateNumber,
    int Year,
    string? CustomerName,
    string? CustomerPhone,
    string ServiceType,
    JobCardStatus Status,
    FuelLevel FuelLevel,
    int Mileage,
    string ReceivedByName,
    string? TechnicianName,
    DateTime CreatedAt,
    DateTime? ClosedAt,
    string? DeliveryNoteNumber);
