using FluentValidation;
using FluentValidation.Results;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Entities;

namespace RwandaMotor.Application.Features.Vehicles.Commands;

public record CreateVehicleCommand(
    string VIN,
    string? PlateNumber,
    Guid BrandId,
    Guid ModelId,
    int Year,
    string? EngineNumber,
    string? Color,
    string? FuelType,
    string? Transmission,
    int? EngineCapacityCC,
    Guid? CustomerId,
    DateTime? SaleDate,
    decimal? SalePrice,
    bool IsSoldByDealership,
    int? CurrentMileage,
    DateTime? WarrantyStartDate,
    DateTime? WarrantyEndDate,
    int? WarrantyKmLimit,
    Guid? ServicePolicyId,
    string? Notes
) : IRequest<Guid>;

public class CreateVehicleCommandValidator : AbstractValidator<CreateVehicleCommand>
{
    public CreateVehicleCommandValidator()
    {
        RuleFor(x => x.VIN).NotEmpty().MaximumLength(50);
        RuleFor(x => x.BrandId).NotEmpty();
        RuleFor(x => x.ModelId).NotEmpty();
        RuleFor(x => x.Year).InclusiveBetween(1990, DateTime.UtcNow.Year + 1);
        RuleFor(x => x.CurrentMileage).GreaterThanOrEqualTo(0).When(x => x.CurrentMileage.HasValue);
    }
}

public class CreateVehicleCommandHandler : IRequestHandler<CreateVehicleCommand, Guid>
{
    private readonly IApplicationDbContext _db;
    private readonly IServiceIntervalEngine _intervalEngine;

    public CreateVehicleCommandHandler(IApplicationDbContext db, IServiceIntervalEngine intervalEngine)
    {
        _db = db;
        _intervalEngine = intervalEngine;
    }

    public async Task<Guid> Handle(CreateVehicleCommand cmd, CancellationToken ct)
    {
        var normalizedVin = cmd.VIN.Trim().ToUpper();

        // Reject if an active vehicle already has this VIN.
        if (await _db.Vehicles.AnyAsync(v => v.VIN == normalizedVin, ct))
            throw new ValidationException(new[] { new ValidationFailure("VIN", $"A vehicle with VIN '{normalizedVin}' already exists.") });

        // If the VIN belongs to a soft-deleted vehicle, restore that record so its
        // full service history remains linked to the same ID.
        var deleted = await _db.Vehicles
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(v => v.VIN == normalizedVin && v.IsDeleted, ct);

        if (deleted != null)
        {
            deleted.IsDeleted    = false;
            deleted.DeletedAt    = null;
            deleted.DeletedBy    = null;
            deleted.PlateNumber  = cmd.PlateNumber?.Trim().ToUpper();
            deleted.BrandId      = cmd.BrandId;
            deleted.ModelId      = cmd.ModelId;
            deleted.Year         = cmd.Year;
            deleted.Color        = cmd.Color;
            deleted.FuelType     = cmd.FuelType;
            deleted.Transmission = cmd.Transmission;
            deleted.CustomerId   = cmd.CustomerId;
            deleted.SaleDate     = cmd.SaleDate;
            deleted.SalePrice    = cmd.SalePrice;
            deleted.IsSoldByDealership = cmd.IsSoldByDealership;
            deleted.CurrentMileage     = cmd.CurrentMileage;
            deleted.WarrantyStartDate  = cmd.WarrantyStartDate;
            deleted.WarrantyEndDate    = cmd.WarrantyEndDate;
            deleted.WarrantyKmLimit    = cmd.WarrantyKmLimit;
            deleted.ServicePolicyId    = cmd.ServicePolicyId;
            deleted.Notes              = cmd.Notes;
            deleted.RetentionStatus    = cmd.IsSoldByDealership
                ? Domain.Enums.RetentionStatus.Active
                : Domain.Enums.RetentionStatus.External;
            deleted.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return deleted.Id;
        }

        var vehicle = new Vehicle
        {
            VIN = normalizedVin,
            PlateNumber = cmd.PlateNumber?.Trim().ToUpper(),
            BrandId = cmd.BrandId,
            ModelId = cmd.ModelId,
            Year = cmd.Year,
            EngineNumber = cmd.EngineNumber,
            Color = cmd.Color,
            FuelType = cmd.FuelType,
            Transmission = cmd.Transmission,
            EngineCapacityCC = cmd.EngineCapacityCC,
            CustomerId = cmd.CustomerId,
            SaleDate = cmd.SaleDate,
            SalePrice = cmd.SalePrice,
            IsSoldByDealership = cmd.IsSoldByDealership,
            CurrentMileage = cmd.CurrentMileage,
            WarrantyStartDate = cmd.WarrantyStartDate,
            WarrantyEndDate = cmd.WarrantyEndDate,
            WarrantyKmLimit = cmd.WarrantyKmLimit,
            ServicePolicyId = cmd.ServicePolicyId,
            Notes = cmd.Notes,
            RetentionStatus = cmd.IsSoldByDealership
                ? Domain.Enums.RetentionStatus.Active
                : Domain.Enums.RetentionStatus.External
        };

        _db.Vehicles.Add(vehicle);
        await _db.SaveChangesAsync(ct);
        return vehicle.Id;
    }
}
