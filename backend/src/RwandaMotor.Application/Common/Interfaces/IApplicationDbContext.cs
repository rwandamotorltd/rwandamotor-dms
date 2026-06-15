using Microsoft.EntityFrameworkCore;
using RwandaMotor.Domain.Entities;

namespace RwandaMotor.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Customer> Customers { get; }
    DbSet<Vehicle> Vehicles { get; }
    DbSet<Brand> Brands { get; }
    DbSet<VehicleModel> VehicleModels { get; }
    DbSet<ServiceRecord> ServiceRecords { get; }
    DbSet<ServicePart> ServiceParts { get; }
    DbSet<ServicePolicy> ServicePolicies { get; }
    DbSet<Technician> Technicians { get; }
    DbSet<WorkshopBay> WorkshopBays { get; }
    DbSet<FollowUp> FollowUps { get; }
    DbSet<ImportLog> ImportLogs { get; }
    DbSet<ImportLogRow> ImportLogRows { get; }
    DbSet<JobCard> JobCards { get; }
    DbSet<JobCardSequence> JobCardSequences { get; }
    DbSet<SalesHistory> SalesHistories { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
