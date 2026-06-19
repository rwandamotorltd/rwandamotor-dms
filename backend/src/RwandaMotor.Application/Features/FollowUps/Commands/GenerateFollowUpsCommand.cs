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
        var r2 = await CreateDueSoonFollowUpsAsync(today, ct);
        var r3 = await CreateLostRecoveryFollowUpsAsync(today, ct);

        return new GenerateFollowUpsResult(r1, r2, r3);
    }

    // Overdue vehicles — RetentionStatus already evaluated by the nightly job
    private async Task<int> CreateServiceDueFollowUpsAsync(DateTime today, CancellationToken ct)
    {
        var vehicles = await _db.Vehicles
            .Include(v => v.Customer)
            .Where(v => !v.IsDeleted
                && v.IsSoldByDealership
                && v.CustomerId.HasValue
                && v.RetentionStatus == RetentionStatus.Overdue)
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

            var lastServiceInfo = v.LastServiceDate.HasValue
                ? $"Last service: {v.LastServiceDate.Value:dd MMM yyyy}."
                : "No service history on record.";

            _db.FollowUps.Add(new FollowUp
            {
                VehicleId     = v.Id,
                CustomerId    = v.CustomerId!.Value,
                Status        = FollowUpStatus.Pending,
                Priority      = FollowUpPriority.High,
                ContactMethod = ContactMethod.Phone,
                Reason        = "ServiceDueReminder",
                Notes         = $"Vehicle is overdue for service. {lastServiceInfo} Contact customer to schedule next service.",
                DueDate       = today,
                CreatedBy     = "System"
            });

            _db.Notifications.Add(new Notification
            {
                Title      = "Service Follow-up Required",
                Message    = $"{v.Customer?.FullName ?? "Customer"} — {v.PlateNumber ?? v.VIN} is overdue for service.",
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

    // DueSoon vehicles — service due within the lead window
    private async Task<int> CreateDueSoonFollowUpsAsync(DateTime today, CancellationToken ct)
    {
        var vehicles = await _db.Vehicles
            .Include(v => v.Customer)
            .Where(v => !v.IsDeleted
                && v.IsSoldByDealership
                && v.CustomerId.HasValue
                && v.RetentionStatus == RetentionStatus.DueSoon)
            .ToListAsync(ct);

        if (vehicles.Count == 0) return 0;

        var vehicleIds = vehicles.Select(v => v.Id).ToList();
        var existing = await _db.FollowUps
            .Where(f => !f.IsDeleted
                && vehicleIds.Contains(f.VehicleId)
                && f.Reason == "ServiceDue15Days"
                && (f.Status == FollowUpStatus.Pending || f.Status == FollowUpStatus.InProgress))
            .Select(f => f.VehicleId)
            .ToHashSetAsync(ct);

        int created = 0;
        foreach (var v in vehicles)
        {
            if (existing.Contains(v.Id)) continue;

            var dueInfo = v.NextServiceDate.HasValue
                ? $"Next service due: {v.NextServiceDate.Value:dd MMM yyyy}."
                : "Service due soon.";

            _db.FollowUps.Add(new FollowUp
            {
                VehicleId     = v.Id,
                CustomerId    = v.CustomerId!.Value,
                Status        = FollowUpStatus.Pending,
                Priority      = FollowUpPriority.Medium,
                ContactMethod = ContactMethod.Phone,
                Reason        = "ServiceDue15Days",
                Notes         = $"{dueInfo} Call customer to confirm appointment.",
                DueDate       = today,
                CreatedBy     = "System"
            });

            _db.Notifications.Add(new Notification
            {
                Title      = "Service Due Soon",
                Message    = $"{v.Customer?.FullName ?? "Customer"} — {v.PlateNumber ?? v.VIN} service due soon.",
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

    // Lost vehicles — no return in 12+ months
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
                Notes         = $"Lost customer — {(v.LastServiceDate.HasValue ? $"last seen {v.LastServiceDate.Value:dd MMM yyyy}" : "no service history")}. Contact to understand why and offer incentive.",
                DueDate       = today,
                CreatedBy     = "System"
            });

            _db.Notifications.Add(new Notification
            {
                Title      = "Lost Customer — Recovery Required",
                Message    = $"{v.Customer?.FullName ?? "Customer"} — {v.PlateNumber ?? v.VIN} has not returned.",
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
