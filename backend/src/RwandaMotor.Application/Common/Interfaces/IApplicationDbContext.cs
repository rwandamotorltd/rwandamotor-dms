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
    DbSet<PermissionGroup> PermissionGroups { get; }
    DbSet<CompanySettings> CompanySettings { get; }
    DbSet<AuditLog> AuditLogs { get; }
    DbSet<FollowUpInteraction> FollowUpInteractions { get; }
    DbSet<Appointment> Appointments { get; }
    DbSet<Notification> Notifications { get; }
    DbSet<DocumentTemplate> DocumentTemplates { get; }
    DbSet<AppRole> AppRoles { get; }
    DbSet<BrandColor> BrandColors { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
