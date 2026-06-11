using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;

namespace RwandaMotor.Application.Features.Retention.Queries;

/// <param name="ServiceYear">The calendar year in which visits are counted. Defaults to the current year.</param>
public record GetVisitFrequencyCohortQuery(int? ServiceYear = null) : IRequest<VisitFrequencyCohortDto>;

public class GetVisitFrequencyCohortQueryHandler
    : IRequestHandler<GetVisitFrequencyCohortQuery, VisitFrequencyCohortDto>
{
    private readonly IApplicationDbContext _db;

    public GetVisitFrequencyCohortQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<VisitFrequencyCohortDto> Handle(
        GetVisitFrequencyCohortQuery request, CancellationToken ct)
    {
        var currentYear = request.ServiceYear ?? DateTime.UtcNow.Year;
        var yearStart   = new DateTime(currentYear, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var yearEnd     = new DateTime(currentYear, 12, 31, 23, 59, 59, DateTimeKind.Utc);

        // Load all dealership vehicles that have a sale date,
        // together with their model/brand and only the service records
        // that fall within the current calendar year.
        var vehicles = await _db.Vehicles
            .Where(v => !v.IsDeleted && v.IsSoldByDealership && v.SaleDate.HasValue)
            .Include(v => v.Model)
                .ThenInclude(m => m.Brand)
            .Select(v => new
            {
                v.SaleDate,
                ModelName = v.Model.Name,
                BrandName = v.Model.Brand.Name,
                CurrentYearVisits = v.ServiceRecords
                    .Count(s => !s.IsDeleted
                             && s.ServiceDate >= yearStart
                             && s.ServiceDate <= yearEnd)
            })
            .ToListAsync(ct);

        // ── helpers ─────────────────────────────────────────────────────────
        static (int zero, int one, int two, int moreTwo) Bucket(IEnumerable<int> counts)
        {
            int z = 0, o = 0, t = 0, m = 0;
            foreach (var c in counts)
            {
                if      (c == 0) z++;
                else if (c == 1) o++;
                else if (c == 2) t++;
                else             m++;
            }
            return (z, o, t, m);
        }

        static decimal Rate(int total, int zero) =>
            total > 0 ? Math.Round((decimal)(total - zero) / total * 100, 2) : 0m;

        // ── year-wise ────────────────────────────────────────────────────────
        var yearWise = vehicles
            .GroupBy(v => v.SaleDate!.Value.Year)
            .OrderBy(g => g.Key)
            .Select(g =>
            {
                var (z, o, tw, m) = Bucket(g.Select(v => v.CurrentYearVisits));
                var total = g.Count();
                return new YearWiseCohortRow(g.Key, total, z, o, tw, m, Rate(total, z));
            })
            .ToList();

        // ── model-wise ───────────────────────────────────────────────────────
        var modelWise = vehicles
            .GroupBy(v => new { v.ModelName, v.BrandName })
            .OrderBy(g => g.Key.BrandName).ThenBy(g => g.Key.ModelName)
            .Select(g =>
            {
                var (z, o, tw, m) = Bucket(g.Select(v => v.CurrentYearVisits));
                var total = g.Count();
                return new ModelWiseCohortRow(g.Key.ModelName, g.Key.BrandName, total, z, o, tw, m, Rate(total, z));
            })
            .ToList();

        return new VisitFrequencyCohortDto(yearWise, modelWise, currentYear, DateTime.UtcNow.Year);
    }
}

// ── DTOs ────────────────────────────────────────────────────────────────────

public record YearWiseCohortRow(
    int SaleYear,
    int TotalSold,
    int ZeroVisits,
    int OneVisit,
    int TwoVisits,
    int MoreThanTwo,
    decimal RetentionRate);

public record ModelWiseCohortRow(
    string ModelName,
    string BrandName,
    int TotalSold,
    int ZeroVisits,
    int OneVisit,
    int TwoVisits,
    int MoreThanTwo,
    decimal RetentionRate);

public record VisitFrequencyCohortDto(
    List<YearWiseCohortRow> YearWise,
    List<ModelWiseCohortRow> ModelWise,
    int CurrentYear,
    int TodayYear);
