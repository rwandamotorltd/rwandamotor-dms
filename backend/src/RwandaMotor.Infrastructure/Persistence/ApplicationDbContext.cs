using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Common;
using RwandaMotor.Domain.Entities;

namespace RwandaMotor.Infrastructure.Persistence;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<Brand> Brands => Set<Brand>();
    public DbSet<VehicleModel> VehicleModels => Set<VehicleModel>();
    public DbSet<ServiceRecord> ServiceRecords => Set<ServiceRecord>();
    public DbSet<ServicePart> ServiceParts => Set<ServicePart>();
    public DbSet<ServicePolicy> ServicePolicies => Set<ServicePolicy>();
    public DbSet<Technician> Technicians => Set<Technician>();
    public DbSet<WorkshopBay> WorkshopBays => Set<WorkshopBay>();
    public DbSet<FollowUp> FollowUps => Set<FollowUp>();
    public DbSet<ImportLog> ImportLogs => Set<ImportLog>();
    public DbSet<ImportLogRow> ImportLogRows => Set<ImportLogRow>();
    public DbSet<JobCard> JobCards => Set<JobCard>();
    public DbSet<JobCardSequence> JobCardSequences => Set<JobCardSequence>();
    public DbSet<SalesHistory> SalesHistories => Set<SalesHistory>();
    public DbSet<PermissionGroup> PermissionGroups => Set<PermissionGroup>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);

        // Global query filter: soft deletes
        builder.Entity<Customer>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<Vehicle>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<Brand>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<VehicleModel>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<ServiceRecord>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<ServicePart>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<ServicePolicy>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<Technician>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<WorkshopBay>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<FollowUp>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<ImportLog>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<ImportLogRow>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<JobCard>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<SalesHistory>().HasQueryFilter(e => !e.IsDeleted);

        // Store accessories list as a JSON column
        builder.Entity<JobCard>()
            .Property(j => j.AccessoriesPresent)
            .HasColumnType("jsonb")