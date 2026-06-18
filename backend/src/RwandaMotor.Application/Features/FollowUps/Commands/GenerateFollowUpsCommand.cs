using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Entities;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.FollowUps.Commands;

public record GenerateFollowUpsCommand : IRequest<GenerateFollowUpsResult>;

public record GenerateFollowUpsResult(int ServiceDueReminders, int ServiceDue15Days, int LostRecovery)
{
    public int Total => ServiceDueReminders + ServiceDue15Days + LostRecovery;
}

public class GenerateFollowUpsHandler : IRequestHandler<GenerateFollowUpsCommand, GenerateFollowUpsResult>
{
    private readonly IApplicationDbContext _db;

    public GenerateFollowUpsHandler(IApplicationDbContext db) => _db = db;

    public async Task<GenerateFollowUpsResult> Handle(GenerateFollowUpsCommand _, CancellationToken ct)
    {
        var today = DateTime.UtcNow.Date;

        var r1 = await CreateServiceDueFollowUpsAsync(today, ct);
        var r2 = await CreateDue15DayFollowUpsAsync(today, ct);
        var r3 = await CreateLostRecoveryFollowUpsAsync(today, ct);

        return new GenerateFollowUpsResult(r1, r2, r3);
    }

    // All dealership vehicles whose last service >= 6 months ago, no active follow-up yet
    private async Task<int> CreateServiceDueFollowUpsAsync(DateTime today, CancellationToken ct)
    {
        var cutoff = today.AddMonths(-6);

        var vehicles = await _db.Vehicles
            .Include(v => v.Customer)
            .Where(v => !v.IsDeleted
                && v.IsSoldByDealership
                && v.CustomerId.HasValue
                && v.LastServiceDate.HasValue
                && v.LastServiceDate.Value.Date <= cutoff
                && v.RetentionStatus != RetentionStatus.Lost)
            .ToListAsync(ct);

        if (vehicles.Count == 0) return 0;

        var vehicleIds = vehicles.Select(v => v.Id).ToList();
        var existing = await _db.FollowUps
            .Where(f => !f.IsDeleted
                && vehicleIds.Contains(f.VehicleId)
                && f.Reason == "ServiceDueReminder"
                && (f.Status == FollowUpStatus.Pending || f.Status == FollowUpStatus.InProgress))
            .Select(f => f.VehicleId)
            .ToHashSetAsync(ct);

        int created = 0;
        foreach (var v in vehicles)
        {
            if (existing.Contains(v.Id)) continue;

            _db.FollowUps.Add(new FollowUp
            {
                VehicleId     = v.Id,
                CustomerId    = v.CustomerId!.Value,
                Status        = FollowUpStatus.Pending,
                Priority      = FollowUpPriority.High,
                ContactMethod = ContactMethod.Phone,
                Reason        = "ServiceDueReminder",
                Notes         = $"Service overdue. Last service: {v.LastServiceDate!.Value:dd MMM yyyy}. Contact customer to schedule next service.",
                DueDate       = today,
                CreatedBy     = "System"
            });

            _db.Notifications.Add(new Notification
            {
                Title      = "Service Follow-up Required",
                Message    = $"{v.Customer?.FullName ?? "Customer"} — {v.PlateNumber ?? v.VIN} hasn't been in for service in 6+ months.",
                Type       = NotificationType.ServiceDueSoon,
                VehicleId  = v.Id,
                CustomerId = v.CustomerId,
                Link       = "/follow-ups",
                CreatedBy  = "System"
            });

            created++;
        }

        if (created > 0) await _db.SaveChangesAsync(ct);
        return created;
    }

    // Vehicles with next service date within 15 days, no active reminder yet
    private async Task<int> CreateDue15DayFollowUpsAsync(DateTime today, CancellationToken ct)
    {
        var cutoff = today.AddDays(15);

        var vehicles = await _db.Vehicles
            .Include(v => v.Customer)
            .Where(v => !v.IsDeleted
                && v.IsSoldByDealership
                && v.CustomerId.HasValue
                && v.NextServiceDate.HasValue
                && v.NextServiceDate.Value.Date >= today
                && v.NextServiceDate.Value.Date <= cutoff)
            .ToListAsync(ct);

        if (vehicles.Count == 0) return 0;

        var vehicleIds = vehicles.Select(v => v.Id).ToList();
        var existing = await _db.FollowUps
            .Where(f => !f.IsDeleted
                && vehicleIds.Contains(f.VehicleId)
                && f.Reason == "ServiceDue15Days"
                && f.Status == FollowUpStatus.Pending)
            .Select(f => f.VehicleId)
            .ToHashSetAsync(ct);

        int created = 0;
        foreach (var v in vehicles)
        {
            if (existing.Contains(v.Id)) continue;

            var dueDate = v.NextServiceDate!.Value.Date.AddDays(-5);
            if (dueDate < today) dueDate = today;

            _db.FollowUps.Add(new FollowUp
            {
                VehicleId     = v.Id,
                CustomerId    = v.CustomerId!.Value,
                Status        = FollowUpStatus.Pending,
                Priority      = FollowUpPriority.High,
                ContactMethod = ContactMethod.Phone,
                Reason        = "ServiceDue15Days",
                Notes         = $"Service due {v.NextServiceDate.Value:dd MMM yyyy}. Call customer to confirm appointment.",
                DueDate       = dueDate,
                CreatedBy     = "System"
            });

            _db.Notifications.Add(new Notification
            {
                Title      = "Service Due in 15 Days",
                Message    = $"{v.Customer?.FullName ?? "Customer"} — {v.PlateNumber ?? v.VIN} service due {v.NextServiceDate.Value:dd MMM yyyy}.",
                Type       = NotificationType.ServiceDue15Days,
                VehicleId  = v.Id,
                CustomerId = v.CustomerId,
                Link       = "/follow-ups",
                CreatedBy  = "System"
            });

            created++;
        }

        if (created > 0) await _db.SaveChangesAsync(ct);
        return created;
    }

    // All Lost vehicles without an active LostRecovery follow-up
    private async Task<int> CreateLostRecoveryFollowUpsAsync(DateTime today, CancellationToken ct)
    {
        var vehicles = await _db.Vehicles
            .Include(v => v.Customer)
            .Where(v => !v.IsDeleted
                && v.IsSoldByDealership
                && v.CustomerId.HasValue
                && v.RetentionStatus == RetentionStatus.Lost)
            .ToListAsync(ct);

        if (vehicles.Count == 0) return 0;

        var vehicleIds = vehicles.Select(v => v.Id).ToList();
        var existing = await _db.FollowUps
            .Where(f => !f.IsDeleted
                && vehicleIds.Contains(f.VehicleId)
                && f.Reason == "LostRecovery"
                && (f.Status == FollowUpStatus.Pending || f.Status == FollowUpStatus.InProgress))
            .Select(f => f.VehicleId)
            .ToHashSetAsync(ct);

        int created = 0;
        foreach (var v in vehicles)
        {
            if (existing.Contains(v.Id)) continue;

            _db.FollowUps.Add(new FollowUp
            {
                VehicleId     = v.Id,
                CustomerId    = v.CustomerId!.Value,
                Status        = FollowUpStatus.Pending,
                Priority      = FollowUpPriority.Critical,
                ContactMethod = ContactMethod.Phone,
                Reason        = "LostRecovery",
                Notes         = $"12+ months without service (last: {v.LastServiceDate?.ToString("dd MMM yyyy") ?? "unknown"}). Priority recovery — contact to understand why and offer incentive.",
                DueDate       = today,
                CreatedBy     = "System"
            });

            _db.Notifications.Add(new Notification
            {
                Title      = "Lost Customer — Recovery Required",
                Message    = $"{v.Customer?.FullName ?? "Customer"} — {v.PlateNumber ?? v.VIN} has not returned in 12+ months.",
                Type       = NotificationType.CustomerLost,
                VehicleId  = v.Id,
                CustomerId = v.CustomerId,
                Link       = "/follow-ups",
                CreatedBy  = "System"
            });

            created++;
        }

        if (created > 0) await _db.SaveChangesAsync(ct);
        return created;
    }
}
