using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RwandaMotor.Domain.Entities;

namespace RwandaMotor.Infrastructure.Persistence.Configurations;

public class VehicleConfiguration : IEntityTypeConfiguration<Vehicle>
{
    public void Configure(EntityTypeBuilder<Vehicle> builder)
    {
        builder.HasKey(v => v.Id);
        builder.Property(v => v.VIN).IsRequired().HasMaxLength(50);
        builder.HasIndex(v => v.VIN).IsUnique();
        builder.Property(v => v.PlateNumber).HasMaxLength(20);
        builder.HasIndex(v => v.PlateNumber);
        builder.Property(v => v.SalePrice).HasPrecision(18, 2);
        builder.Property(v => v.RetentionStatus).HasConversion<int>();

        builder.HasOne(v => v.Brand).WithMany().HasForeignKey(v => v.BrandId).IsRequired(false).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(v => v.Model).WithMany().HasForeignKey(v => v.ModelId).IsRequired(false).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(v => v.Customer).WithMany(c => c.Vehicles).HasForeignKey(v => v.CustomerId).OnDelete(DeleteBehavior.SetNull);
        builder.HasOne(v => v.ServicePolicy).WithMany().HasForeignKey(v => v.ServicePolicyId).OnDelete(DeleteBehavior.SetNull);
        builder.HasMany(v => v.ServiceRecords).WithOne(sr => sr.Vehicle).HasForeignKey(sr => sr.VehicleId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(v => v.FollowUps).WithOne(f => f.Vehicle).HasForeignKey(f => f.VehicleId).OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(v => v.CustomerId);
        builder.HasIndex(v => v.BrandId);
        builder.HasIndex(v => v.ModelId);
        builder.HasIndex(v => v.RetentionStatus);
        builder.HasIndex(v => v.NextServiceDate);
        builder.HasIndex(v => v.SaleDate);
    }
}

public class ServiceRecordConfiguration : IEntityTypeConfiguration<ServiceRecord>
{
    public void Configure(EntityTypeBuilder<ServiceRecord> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.LaborCost).HasPrecision(18, 2);
        builder.Property(s => s.PartsCost).HasPrecision(18, 2);
        builder.Property(s => s.TotalCost).HasPrecision(18, 2);
        builder.Property(s => s.ServiceType).HasConversion<int>();

        builder.HasOne(s => s.Vehicle).WithMany(v => v.ServiceRecords).HasForeignKey(s => s.VehicleId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(s => s.Technician).WithMany(t => t.ServiceRecords).HasForeignKey(s => s.TechnicianId).OnDelete(DeleteBehavior.SetNull);
        builder.HasOne(s => s.Bay).WithMany(b => b.ServiceRecords).HasForeignKey(s => s.BayId).OnDelete(DeleteBehavior.SetNull);
        builder.HasMany(s => s.Parts).WithOne(p => p.ServiceRecord).HasForeignKey(p => p.ServiceRecordId).OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(s => s.VehicleId);
        builder.HasIndex(s => s.ServiceDate);
        builder.HasIndex(s => s.TechnicianId);
    }
}

public class ServicePartConfiguration : IEntityTypeConfiguration<ServicePart>
{
    public void Configure(EntityTypeBuilder<ServicePart> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.UnitPrice).HasPrecision(18, 2);
        builder.Property(p => p.TotalPrice).HasPrecision(18, 2);
    }
}
