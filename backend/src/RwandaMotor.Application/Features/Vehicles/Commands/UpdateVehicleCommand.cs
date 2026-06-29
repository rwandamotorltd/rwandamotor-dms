using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.Vehicles.Commands;

public record UpdateVehicleCommand(
    Guid Id,
    string? PlateNumber,
    int? CurrentMileage,
    string? Color,
    string? FuelType,
    string? Transmission,
    string? EngineNumber,
    int? EngineCapacityCC,
    DateTime? WarrantyStartDate,
    DateTime? WarrantyEndDate,
    int? WarrantyKmLimit,
    Guid? ServicePolicyId,
    RetentionStatus? RetentionStatus,
    string? Notes,
    Guid? BrandId = null,
    Guid? ModelId = null,
    int? Year = null,
    Guid? CustomerId = null,
    bool ClearCustomer = false
) : IRequest<bool>;

public class UpdateVehicleCommandValidator : AbstractValidator<UpdateVehicleCommand>
{
    public UpdateVehicleCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.CurrentMileage).GreaterThanOrEqualTo(0).When(x => x.CurrentMileage.HasValue);
        RuleFor(x => x.PlateNumber).MaximumLength(20).When(x => x.PlateNumber != null);
        RuleFor(x => x.Notes).MaximumLength(2000).When(x => x.Notes != null);
        RuleFor(x => x.Year).InclusiveBetween(1900, 2100).When(x => x.Year.HasValue);
    }
}

public class UpdateVehicleCommandHandler : IRequestHandler<UpdateVehicleCommand, bool>
{
    private readonly IApplicationDbContext _db;

    public UpdateVehicleCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<bool> Handle(UpdateVehicleCommand cmd, CancellationToken ct)
    {
        var vehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.Id == cmd.Id && !v.IsDeleted, ct);
        if (vehicle == null) return false;

        if (cmd.PlateNumber is not null)
            vehicle.PlateNumber = cmd.PlateNumber.Trim().ToUpper();
        if (cmd.CurrentMileage.HasValue)
            vehicle.CurrentMileage = cmd.CurrentMileage;
        if (cmd.Color is not null)
            vehicle.Color = cmd.Color.Trim();
        if (cmd.FuelType is not null)
            vehicle.FuelType = cmd.FuelType.Trim();
        if (cmd.Transmission is not null)
            vehicle.Transmission = cmd.Transmission.Trim();
        if (cmd.EngineNumber is not null)
            vehicle.EngineNumber = cmd.EngineNumber.Trim();
        if (cmd.EngineCapacityCC.HasValue)
            vehicle.EngineCapacityCC = cmd.EngineCapacityCC;
        if (cmd.WarrantyStartDate.HasValue)
            vehicle.WarrantyStartDate = cmd.WarrantyStartDate;
        if (cmd.WarrantyEndDate.HasValue)
            vehicle.WarrantyEndDate = cmd.WarrantyEndDate;
        if (cmd.WarrantyKmLimit.HasValue)
            vehicle.WarrantyKmLimit = cmd.WarrantyKmLimit;
        if (cmd.ServicePolicyId.HasValue)
            vehicle.ServicePolicyId = cmd.ServicePolicyId;
        if (cmd.RetentionStatus.HasValue)
        {
            vehicle.RetentionStatus = cmd.RetentionStatus.Value;
            vehicle.RetentionStatusUpdatedAt = DateTime.UtcNow;
        }
        if (cmd.Notes is not null)
            vehicle.Notes = cmd.Notes.Trim();

        // Identity / ownership fields
        if (cmd.BrandId.HasValue)
            vehicle.BrandId = cmd.BrandId.Value;
        if (cmd.ModelId.HasValue)
            vehicle.ModelId = cmd.ModelId.Value;
        if (cmd.Year.HasValue)
            vehicle.Year = cmd.Year.Value;
        if (cmd.CustomerId.HasValue)
            vehicle.CustomerId = cmd.CustomerId.Value;
        else if (cmd.ClearCustomer)
            vehicle.CustomerId = null;

        await _db.SaveChangesAsync(ct);
        return true;
    }
}
