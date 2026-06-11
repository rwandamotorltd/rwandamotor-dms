using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RwandaMotor.Domain.Entities;

namespace RwandaMotor.Infrastructure.Persistence.Configurations;

public class CustomerConfiguration : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> builder)
    {
        builder.HasKey(c => c.Id);
        builder.Property(c => c.FullName).IsRequired().HasMaxLength(200);
        builder.Property(c => c.Phone).HasMaxLength(20);
        builder.Property(c => c.Email).HasMaxLength(150);
        builder.Property(c => c.Category).HasConversion<int>();
        builder.Property(c => c.PreferredContactMethod).HasConversion<int>();

        builder.HasIndex(c => c.Phone);
        builder.HasIndex(c => c.Email);
        builder.HasIndex(c => c.FullName);
    }
}

public class BrandConfiguration : IEntityTypeConfiguration<Brand>
{
    public void Configure(EntityTypeBuilder<Brand> builder)
    {
        builder.HasKey(b => b.Id);
        builder.Property(b => b.Name).IsRequired().HasMaxLength(100);
        builder.Property(b => b.Code).IsRequired().HasMaxLength(20);
        builder.HasIndex(b => b.Code).IsUnique();
        builder.HasMany(b => b.Models).WithOne(m => m.Brand).HasForeignKey(m => m.BrandId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class VehicleModelConfiguration : IEntityTypeConfiguration<VehicleModel>
{
    public void Configure(EntityTypeBuilder<VehicleModel> builder)
    {
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Name).IsRequired().HasMaxLength(100);
        builder.Property(m => m.Code).IsRequired().HasMaxLength(20);
        builder.HasIndex(m => new { m.BrandId, m.Code }).IsUnique();
    }
}

public class ServicePolicyConfiguration : IEntityTypeConfiguration<ServicePolicy>
{
    public void Configure(EntityTypeBuilder<ServicePolicy> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Name).IsRequired().HasMaxLength(200);
        builder.HasOne(p => p.Brand).WithMany(b => b.ServicePolicies).HasForeignKey(p => p.BrandId).OnDelete(DeleteBehavior.SetNull);
        builder.HasOne(p => p.Model).WithMany(m => m.ServicePolicies).HasForeignKey(p => p.ModelId).OnDelete(DeleteBehavior.SetNull);
    }
}

public class FollowUpConfiguration : IEntityTypeConfiguration<FollowUp>
{
    public void Configure(EntityTypeBuilder<FollowUp> builder)
    {
        builder.HasKey(f => f.Id);
        builder.Property(f => f.Status).HasConversion<int>();
        builder.Property(f => f.Priority).HasConversion<int>();
        builder.Property(f => f.ContactMethod).HasConversion<int>();
        builder.HasOne(f => f.Customer).WithMany(c => c.FollowUps).HasForeignKey(f => f.CustomerId).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(f => f.Status);
        builder.HasIndex(f => f.DueDate);
        builder.HasIndex(f => f.VehicleId);
    }
}

public class ImportLogConfiguration : IEntityTypeConfiguration<ImportLog>
{
    public void Configure(EntityTypeBuilder<ImportLog> builder)
    {
        builder.HasKey(i => i.Id);
        builder.Property(i => i.Status).HasConversion<int>();
        builder.Property(i => i.ImportType).HasConversion<int>();
        builder.HasMany(i => i.Rows).WithOne(r => r.ImportLog).HasForeignKey(r => r.ImportLogId).OnDelete(DeleteBehavior.Cascade);
    }
}
