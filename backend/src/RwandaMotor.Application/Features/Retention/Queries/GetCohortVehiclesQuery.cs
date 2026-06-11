using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;

namespace RwandaMotor.Application.Features.Retention.Queries;

/// <summary>
/// Returns the individual vehicles that belong to a specific cell in the
/// visit-frequency cohort table so the user can drill through from a number
/// to the actual cars behind it.
/// </summary>
/// <param name="ServiceYear">Calendar year in which visits are counted.</param>
/// <param name="SaleYear">Optional — filter to vehicles sold in this year (age-wise table).</param>
/// <param name="ModelName">Optional — filter to a specific model (model-wise table).</param>
/// <param name="BrandName">Optional — used together with ModelName.</param>
/// <param name="VisitBucket">
///   "zero"        → 0 visits in ServiceYear
///   "one"         → exactly 1 visit
///   "two"         → exactly 2 visits
///   "moreThanTwo" → 3+ visits
///   "visited"     → 1 or more visits (all retained)
/// </param>
public record GetCohortVehiclesQuery(
    int ServiceYear,
    int? SaleYear,
    string? ModelName,
    string? BrandName,
    string VisitBucket
) : IRequest<List<CohortVehicleDto>>;

public class GetCohortVehiclesQueryHandler
    : IRequestHandler<GetCohortVehiclesQuery, List<CohortVehicleDto>>
{
    private readonly IApplicationDbContext _db;

    public GetCohortVehiclesQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<List<CohortVehicleDto>> Handle(
        GetCohortVehiclesQuery q, CancellationToken ct)
    {
        var yearStart = new DateTime(q.ServiceYear, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var yearEnd   = new DateTime(q.ServiceYear, 12, 31, 23, 59, 59, DateTimeKind.Utc);

        var query = _db.Vehicles
            .Where(v => !v.IsDeleted && v.IsSoldByDealership && v.SaleDate.HasValue);

        if (q.SaleYear.HasValue)
            query = query.Where(v => v.SaleDate!.Value.Year == q.SaleYear.Value);

        if (!string.IsNullOrWhiteSpace(q.ModelName))
            query = query.Where(v => v.Model.Name == q.ModelName);

        if (!string.IsNullOrWhiteSpace(q.BrandName))
            query = query.Where(v => v.Model.Brand.Name == q.BrandName);

        // Pull each vehicle with its visit count in the selected year
        var rows = await query
            .Select(v => new
            {
                v.Id,
                v.VIN,
                v.PlateNumber,
                BrandName = v.Brand.Name,
                ModelName = v.Model.Name,
                v.Year,
                CustomerName  = v.Customer != null ? v.Customer.FullName : null,
                CustomerPhone = v.Customer != null ? v.Customer.Phone : null,
                VisitsInYear  = v.ServiceRecords
                    .Count(s => !s.IsDeleted
                             && s.ServiceDate >= yearStart
                             && s.ServiceDate <= yearEnd),
            })
            .ToListAsync(ct);

        // Filter to the requested bucket
        var filtered = q.VisitBucket switch
        {
            "zero"        => rows.Where(r => r.VisitsInYear == 0),
            "one"         => rows.Where(r => r.VisitsInYear == 1),
            "two"         => rows.Where(r => r.VisitsInYear == 2),
            "moreThanTwo" => rows.Where(r => r.VisitsInYear >= 3),
            "visited"     => rows.Where(r => r.VisitsInYear >= 1),
            _             => rows.AsEnumerable(),
        };

        return filtered
            .OrderBy(r => r.BrandName)
            .ThenBy(r => r.ModelName)
            .ThenBy(r => r.CustomerName)
            .Select(r => new CohortVehicleDto(
                r.Id, r.VIN, r.PlateNumber,
                r.BrandName, r.ModelName, r.Year,
                r.CustomerName, r.CustomerPhone, r.VisitsInYear))
            .ToList();
    }
}

public record CohortVehicleDto(
    Guid Id,
    string VIN,
    string? PlateNumber,
    string BrandName,
    string ModelName,
    int Year,
    string? CustomerName,
    string? CustomerPhone,
    int VisitsInYear);
