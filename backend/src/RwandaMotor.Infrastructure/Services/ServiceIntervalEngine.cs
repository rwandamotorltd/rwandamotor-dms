using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Entities;

namespace RwandaMotor.Infrastructure.Services;

/// <summary>
/// Resolves the correct service policy for a vehicle (vehicle override → model → brand → default)
/// and calculates the next service due date and mileage dynamically.
/// </summary>
public class ServiceIntervalEngine : IServiceIntervalEngine
{
    private readonly IApplicationDbContext _db;
    private readonly ILogger<ServiceIntervalEngine> _logger;

    public ServiceIntervalEngine(IApplicationDbContext db, ILogger<ServiceIntervalEngine> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<NextServiceResult> CalculateNextServiceAsync(
        Guid vehicleId, int currentMileage, DateTime serviceDate, CancellationToken ct = default)
    {
        var policy = await ResolvePolicy(vehicleId, ct);

        var nextMileage = currentMileage + policy.IntervalKm;
        var nextDate = serviceDate.AddMonths(policy.IntervalMonths);

        _logger.LogDebug("Vehicle {VehicleId}: policy '{Policy}', next @ {KM}km or {Date:yyyy-MM-dd}",
            vehicleId, policy.Name, nextMileage, nextDate);

        return new NextServiceResult(nextMileage, nextDate, policy.Id, policy.Name, policy.IntervalKm, policy.IntervalMonths);
    }

    public async Task<ServiceDueStatus> DetermineServiceDueStatusAsync(Guid vehicleId, CancellationToken ct = default)
    {
        var vehicle = await _db.Vehicles
            .Include(v => v.ServicePolicy)
            .FirstOrDefaultAsync(v => v.Id == vehicleId, ct);

        if (vehicle == null) return ServiceDueStatus.Active;

        var policy = await ResolvePolicy(vehicleId, ct);
        var now = DateTime.UtcNow;

        // No service history yet — newly sold vehicle is considered active
        if (!vehicle.LastServiceDate.HasValue && !vehicle.NextServiceDate.HasValue)
            return ServiceDueStatus.Active;

        var nextDate = vehicle.NextServiceDate ?? vehicle.LastServiceDate!.Value.AddMonths(policy.IntervalMonths);
        var daysUntilDue = (nextDate - now).TotalDays;
        var monthsOverdue = (now - nextDate).TotalDays / 30.0;

        if (monthsOverdue >= policy.LostThresholdMonths)
            return ServiceDueStatus.Lost;

        if (daysUntilDue < 0)
            return ServiceDueStatus.Overdue;

        if (daysUntilDue <= policy.DueSoonLeadDays)
            return ServiceDueStatus.DueSoon;

        // Also check mileage proximity if current mileage is known
        if (vehicle.CurrentMileage.HasValue && vehicle.NextServiceMileage.HasValue)
        {
            var kmUntilDue = vehicle.NextServiceMileage.Value - vehicle.CurrentMileage.Value;
            if (kmUntilDue <= 0) return ServiceDueStatus.Overdue;
            if (kmUntilDue <= policy.DueSoonLeadKm) return ServiceDueStatus.DueSoon;
        }

        return ServiceDueStatus.Active;
    }

    private async Task<ServicePolicy> ResolvePolicy(Guid vehicleId, CancellationToken ct)
    {
        var vehicle = await _db.Vehicles
            .Include(v => v.ServicePolicy)
            .FirstOrDefaultAsync(v => v.Id == vehicleId, ct);

        // 1. Vehicle-level override
        if (vehicle?.ServicePolicyId.HasValue == true && vehicle.ServicePolicy != null)
            return vehicle.ServicePolicy;

        // 2. Model-level policy
        if (vehicle?.ModelId != null)
        {
            var modelPolicy = await _db.ServicePolicies
                .Where(p => !p.IsDeleted && p.IsActive && p.ModelId == vehicle.ModelId)
                .FirstOrDefaultAsync(ct);
            if (modelPolicy != null) return modelPolicy;
        }

        // 3. Brand-level policy
        if (vehicle?.BrandId != null)
        {
            var brandPolicy = await _db.ServicePolicies
                .Where(p => !p.IsDeleted && p.IsActive && p.BrandId == vehicle.BrandId && p.ModelId == null)
                .FirstOrDefaultAsync(ct);
            if (brandPolicy != null) return brandPolicy;
        }

        // 4. Default system policy
        var defaultPolicy = await _db.ServicePolicies
            .Where(p => !p.IsDeleted && p.IsActive && p.IsDefault)
            .FirstOrDefaultAsync(ct);

        // Default: standard 5,000 km / 6-month interval for regular vehicles.
        // Electric vehicles (DEEPAL, Changan e-star) resolve a brand- or model-level
        // policy above (10,000 km / 12 months) so they never reach this fallback.
        return defaultPolicy ?? new ServicePolicy
        {
            Name = "System Default",
            IntervalKm = 5000,
            IntervalMonths = 6,
            DueSoonLeadDays = 30,
            DueSoonLeadKm = 500,
            LostThresholdMonths = 12
        };
    }
}
