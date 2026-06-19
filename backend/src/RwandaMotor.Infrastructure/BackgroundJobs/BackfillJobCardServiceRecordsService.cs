using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RwandaMotor.Domain.Entities;
using RwandaMotor.Domain.Enums;
using RwandaMotor.Infrastructure.Persistence;

namespace RwandaMotor.Infrastructure.BackgroundJobs;

/// <summary>
/// One-time startup backfill: creates ServiceRecord rows for every closed JobCard
/// that does not already have a matching record (matched by DeliveryNoteNumber = InvoiceNumber).
/// Safe to run on every startup — idempotent.
/// </summary>
public class BackfillJobCardServiceRecordsService : IHostedService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<BackfillJobCardServiceRecordsService> _logger;

    public BackfillJobCardServiceRecordsService(
        IServiceProvider services,
        ILogger<BackfillJobCardServiceRecordsService> logger)
    {
        _services = services;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken ct)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        try
        {
            // All closed job cards
            var closedCards = await db.JobCards
                .Where(j => j.Status == JobCardStatus.Closed && !j.IsDeleted)
                .ToListAsync(ct);

            if (closedCards.Count == 0)
            {
                _logger.LogInformation("BackfillJobCardServiceRecords: no closed job cards found.");
                return;
            }

            // Invoice numbers that already exist in ServiceRecords
            var existingInvoices = await db.ServiceRecords
                .Where(sr => !sr.IsDeleted && sr.InvoiceNumber != null)
                .Select(sr => sr.InvoiceNumber!)
                .ToListAsync(ct);

            var existingSet = new HashSet<string>(existingInvoices, StringComparer.OrdinalIgnoreCase);

            var toCreate = new List<ServiceRecord>();

            foreach (var jc in closedCards)
            {
                // Key to check: DeliveryNoteNumber if available, else JobCardNumber
                var key = jc.DeliveryNoteNumber ?? jc.JobCardNumber;

                if (existingSet.Contains(key)) continue; // already backfilled

                toCreate.Add(new ServiceRecord
                {
                    VehicleId    = jc.VehicleId,
                    TechnicianId = jc.TechnicianId,
                    ServiceDate  = jc.ClosedAt ?? jc.CreatedAt,
                    MileageAtService = jc.Mileage,
                    ServiceType  = jc.ServiceType,
                    ServiceDescription = $"Auto-created from Job Card {jc.JobCardNumber}",
                    InvoiceNumber = key,
                    Notes        = jc.Notes,
                    CreatedBy    = "system-backfill"
                });

                // Also mark this key as existing so duplicates within same run are skipped
                existingSet.Add(key);
            }

            if (toCreate.Count == 0)
            {
                _logger.LogInformation("BackfillJobCardServiceRecords: all {Count} closed job cards already have service records.",
                    closedCards.Count);
                return;
            }

            db.ServiceRecords.AddRange(toCreate);
            await db.SaveChangesAsync(ct);

            _logger.LogInformation("BackfillJobCardServiceRecords: created {Count} service records from closed job cards.",
                toCreate.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "BackfillJobCardServiceRecords: error during backfill.");
        }
    }

    public Task StopAsync(CancellationToken ct) => Task.CompletedTask;
}
