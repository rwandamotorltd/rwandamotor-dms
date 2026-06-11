using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Infrastructure.Services;

public class RetentionEngine : IRetentionEngine
{
    private readonly IApplicationDbContext _db;
    private readonly IServiceIntervalEngine _intervalEngine;
    private readonly ILogger<RetentionEngine> _logger;

    public RetentionEngine(
        IApplicationDbContext db,
        IServiceIntervalEngine intervalEngine,
        ILogger<RetentionEngine> logger)
    {
        _db = db;
        _intervalEngine = intervalEngine;
        _logger = logger;
    }

    public async Task<RetentionStatus> EvaluateVehicleStatusAsync(Guid vehicleId, CancellationToken ct = default)
    {
        var vehicle = await _db.Vehicles.FindAsync(new object[] { vehicleId }, ct);
        if (vehicle == null) return RetentionStatus.Active;

        // External vehicles are not tracked for dealership retention
        if (!vehicle.IsSoldByDealership) return RetentionStatus.External;

        var dueStatus = await _intervalEngine.DetermineServiceDueStatusAsync(vehicleId, ct);

        var newStatus = dueStatus switch
        {
            ServiceDueStatus.Active => RetentionStatus.Active,
            ServiceDueStatus.DueSoon => RetentionStatus.DueSoon,
            ServiceDueStatus.Overdue => RetentionStatus.Overdue,
            ServiceDueStatus.Lost => RetentionStatus.Lost,
            _ => RetentionStatus.Active
        };

        // Preserve "Recovered" if previously Lost and now coming back
        if (vehicle.RetentionStatus == RetentionStatus.Lost && newStatus == RetentionStatus.Active)
            newStatus = RetentionStatus.Recovered;

        if (vehicle.RetentionStatus != newStatus)
        {
            _logger.LogInformation("Vehicle {VehicleId}: status {Old} → {New}", vehicleId, vehicle.RetentionStatus, newStatus);
            vehicle.RetentionStatus = newStatus;
            vehicle.RetentionStatusUpdatedAt = DateTime.UtcNow;
            vehicle.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
        }

        return newStatus;
    }

    public async Task EvaluateAllVehiclesAsync(CancellationToken ct = default)
    {
        var vehicleIds = await _db.Vehicles
            .Where(v => !v.IsDeleted && v.IsSoldByDealership)
            .Select(v => v.Id)
            .ToListAsync(ct);

        _logger.LogInformation("RetentionEngine: evaluating {Count} vehicles", vehicleIds.Count);
        foreach (var id in vehicleIds)
        {
            try { await EvaluateVehicleStatusAsync(id, ct); }
            catch (Exception ex) { _logger.LogError(ex, "Error evaluating vehicle {Id}", id); }
        }
    }

    public async Task<RetentionSummaryDto> GetRetentionSummaryAsync(
        RetentionPeriod period, DateTime? asOf = null, CancellationToken ct = default)
    {
        var now = asOf ?? DateTime.UtcNow;
        var (periodStart, _) = GetPeriodBounds(period, now);

        // Eligible: vehicles sold by dealership before the period end
        var eligibleIds = await _db.Vehicles
            .Where(v => !v.IsDeleted && v.IsSoldByDealership && v.SaleDate <= now)
            .Select(v => v.Id)
            .ToListAsync(ct);

        var eligible = eligibleIds.Count;

        // Returned: vehicles that had a service record within the period
        var returned = await _db.ServiceRecords
            .Where(s => !s.IsDeleted && eligibleIds.Contains(s.VehicleId)
                     && s.ServiceDate >= periodStart && s.ServiceDate <= now)
            .Select(s => s.VehicleId)
            .Distinct()
            .CountAsync(ct);

        var lost = await _db.Vehicles.CountAsync(v => !v.IsDeleted && v.IsSoldByDealership && v.RetentionStatus == RetentionStatus.Lost, ct);
        var dueSoon = await _db.Vehicles.CountAsync(v => !v.IsDeleted && v.IsSoldByDealership && v.RetentionStatus == RetentionStatus.DueSoon, ct);
        var overdue = await _db.Vehicles.CountAsync(v => !v.IsDeleted && v.IsSoldByDealership && v.RetentionStatus == RetentionStatus.Overdue, ct);
        var recovered = await _db.Vehicles.CountAsync(v => !v.IsDeleted && v.IsSoldByDealership && v.RetentionStatus == RetentionStatus.Recovered, ct);

        var rate = eligible > 0 ? Math.Round((decimal)returned / eligible * 100, 2) : 0;

        return new RetentionSummaryDto(rate, eligible, returned, lost, dueSoon, overdue, recovered, DateTime.UtcNow);
    }

    public async Task<List<RetentionTrendPointDto>> GetRetentionTrendAsync(int months, CancellationToken ct = default)
    {
        var result = new List<RetentionTrendPointDto>();
        var now = DateTime.UtcNow;

        for (int i = months - 1; i >= 0; i--)
        {
            var monthEnd = new DateTime(now.Year, now.Month, 1).AddMonths(-i + 1).AddDays(-1);
            var monthStart = new DateTime(monthEnd.Year, monthEnd.Month, 1);
            var label = monthStart.ToString("MMM yyyy");

            var eligibleIds = await _db.Vehicles
                .Where(v => !v.IsDeleted && v.IsSoldByDealership && v.SaleDate <= monthEnd)
                .Select(v => v.Id).ToListAsync(ct);

            var returned = eligibleIds.Count > 0
                ? await _db.ServiceRecords
                    .Where(s => !s.IsDeleted && eligibleIds.Contains(s.VehicleId)
                             && s.ServiceDate >= monthStart && s.ServiceDate <= monthEnd)
                    .Select(s => s.VehicleId).Distinct().CountAsync(ct)
                : 0;

            var eligible = eligibleIds.Count;
            var rate = eligible > 0 ? Math.Round((decimal)returned / eligible * 100, 2) : 0;
            var lost = eligible - returned;

            result.Add(new RetentionTrendPointDto(label, rate, returned, eligible, lost));
        }

        return result;
    }

    public async Task<List<BrandRetentionDto>> GetRetentionByBrandAsync(DateTime from, DateTime to, CancellationToken ct = default)
    {
        var brands = await _db.Brands.Where(b => !b.IsDeleted && b.IsActive).ToListAsync(ct);
        var result = new List<BrandRetentionDto>();

        foreach (var brand in brands)
        {
            var eligibleIds = await _db.Vehicles
                .Where(v => !v.IsDeleted && v.IsSoldByDealership && v.BrandId == brand.Id && v.SaleDate <= to)
                .Select(v => v.Id).ToListAsync(ct);

            if (eligibleIds.Count == 0) continue;

            var returned = await _db.ServiceRecords
                .Where(s => !s.IsDeleted && eligibleIds.Contains(s.VehicleId)
                         && s.ServiceDate >= from && s.ServiceDate <= to)
                .Select(s => s.VehicleId).Distinct().CountAsync(ct);

            var eligible = eligibleIds.Count;
            var rate = eligible > 0 ? Math.Round((decimal)returned / eligible * 100, 2) : 0;

            result.Add(new BrandRetentionDto(brand.Name, brand.Code, rate, eligible, returned, eligible - returned));
        }

        return result.OrderByDescending(b => b.RetentionRate).ToList();
    }

    public async Task<List<CohortRetentionDto>> GetCohortRetentionAsync(int cohortYear, CancellationToken ct = default)
    {
        var cohortVehicles = await _db.Vehicles
            .Include(v => v.ServiceRecords)
            .Where(v => !v.IsDeleted && v.IsSoldByDealership
                     && v.SaleDate.HasValue
                     && v.SaleDate.Value.Year == cohortYear)
            .ToListAsync(ct);

        // Group by quarter of sale
        var quarters = cohortVehicles
            .GroupBy(v => $"Q{(v.SaleDate!.Value.Month - 1) / 3 + 1} {cohortYear}")
            .OrderBy(g => g.Key)
            .Select(g =>
            {
                var vehicles = g.ToList();
                var n = vehicles.Count;
                double CalcRate(int checkMonths) =>
                    n == 0 ? 0 : Math.Round(
                        (double)vehicles.Count(v => v.ServiceRecords.Any(sr =>
                            !sr.IsDeleted &&
                            sr.ServiceDate >= v.SaleDate &&
                            sr.ServiceDate <= v.SaleDate!.Value.AddMonths(checkMonths))) / n * 100, 2);

                return new CohortRetentionDto(
                    CohortLabel: g.Key,
                    TotalVehicles: n,
                    Month3Rate: (decimal)CalcRate(3),
                    Month6Rate: (decimal)CalcRate(6),
                    Month12Rate: (decimal)CalcRate(12),
                    Month24Rate: (decimal)CalcRate(24)
                );
            })
            .ToList();

        return quarters;
    }

    private static (DateTime Start, DateTime End) GetPeriodBounds(RetentionPeriod period, DateTime now)
    {
        return period switch
        {
            RetentionPeriod.Monthly => (new DateTime(now.Year, now.Month, 1), now),
            RetentionPeriod.Quarterly => (new DateTime(now.Year, ((now.Month - 1) / 3) * 3 + 1, 1), now),
            RetentionPeriod.SixMonth => (now.AddMonths(-6), now),
            RetentionPeriod.Yearly => (new DateTime(now.Year, 1, 1), now),
            _ => (new DateTime(now.Year, now.Month, 1), now)
        };
    }
}
