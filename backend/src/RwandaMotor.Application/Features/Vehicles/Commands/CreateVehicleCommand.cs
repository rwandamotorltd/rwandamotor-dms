using FluentValidation;
using MediatR;
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
        RuleFor(x => x.VIN).NotEmpty().MaximumLength(17).MinimumLength(5);
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
        var vehicle = new Vehicle
        {
            VIN = cmd.VIN.Trim().ToUpper(),
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
