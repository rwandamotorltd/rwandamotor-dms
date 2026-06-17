using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Common;
using RwandaMotor.Domain.Entities;

namespace RwandaMotor.Infrastructure.Persistence;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>, IApplicationDbContext
{
    private readonly ICurrentUserService? _currentUser;

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options, ICurrentUserService? currentUser = null)
        : base(options)
    {
        _currentUser = currentUser;
    }

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
    public DbSet<CompanySettings> CompanySettings => Set<CompanySettings>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

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
            .HasColumnType("jsonb");

        // PermissionGroup: store permissions list as jsonb
        builder.Entity<PermissionGroup>()
            .Property(p => p.Permissions)
            .HasColumnType("jsonb");

        // ApplicationUser: store per-user custom permissions as jsonb
        builder.Entity<ApplicationUser>()
            .Property(u => u.CustomPermissions)
            .HasColumnType("jsonb");
        builder.Entity<PermissionGroup>()
            .HasQueryFilter(p => !p.IsDeleted);

        // Unique index: one sequence row per year
        builder.Entity<JobCardSequence>()
            .HasIndex(s => s.Year)
            .IsUnique();

        // CompanySettings — singleton, no soft-delete, fixed PK
        builder.Entity<CompanySettings>()
            .HasKey(c => c.Id);
        builder.Entity<CompanySettings>()
            .Property(c => c.Id)
            .ValueGeneratedNever();
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var userId    = _currentUser?.UserId    ?? "";
        var userEmail = _currentUser?.Email     ?? "";
        var userName  = _currentUser?.UserName  ?? "";
        bool hasUser  = !string.IsNullOrEmpty(userId);

        var auditEntries = new List<AuditLog>();

        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = now;
                entry.Entity.CreatedBy = userEmail;

                if (hasUser)
                    auditEntries.Add(MakeEntry(entry.Entity, "Created", userId, userEmail, userName, now));
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = now;
                entry.Entity.UpdatedBy = userEmail;

                bool softDeleted = entry.Property(nameof(BaseEntity.IsDeleted)).IsModified
                                   && entry.Entity.IsDeleted;
                if (softDeleted)
                {
                    entry.Entity.DeletedAt = now;
                    entry.Entity.DeletedBy = userEmail;
                }

                if (hasUser)
                    auditEntries.Add(MakeEntry(entry.Entity, softDeleted ? "Deleted" : "Updated",
                        userId, userEmail, userName, now));
            }
        }

        if (auditEntries.Count > 0)
            AuditLogs.AddRange(auditEntries);

        return await base.SaveChangesAsync(cancellationToken);
    }

    private static AuditLog MakeEntry(BaseEntity entity, string action,
        string userId, string userEmail, string userName, DateTime now) => new()
    {
        UserId     = userId,
        UserEmail  = userEmail,
        UserName   = userName,
        Action     = action,
        EntityType = entity.GetType().Name,
        EntityId   = entity.Id.ToString(),
        EntityLabel = entity switch
        {
            Vehicle v        => v.PlateNumber ?? v.VIN,
            Customer c       => c.FullName,
            JobCard j        => j.JobCardNumber,
            ServiceRecord s  => s.InvoiceNumber ?? s.Id.ToString()[..8],
            ImportLog i      => i.FileName,
            _                => null,
        },
        OccurredAt = now,
    };
}
