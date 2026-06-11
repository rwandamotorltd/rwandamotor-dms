using FluentValidation;
using MediatR;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Entities;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.ServiceRecords.Commands;

public record CreateServiceRecordCommand(
    Guid VehicleId,
    Guid? TechnicianId,
    Guid? BayId,
    DateTime ServiceDate,
    int MileageAtService,
    ServiceType ServiceType,
    string? ServiceDescription,
    string? InvoiceNumber,
    decimal? LaborCost,
    decimal? PartsCost,
    decimal? TotalCost,
    bool IsWarrantyJob,
    bool IsRecallJob,
    string? Notes,
    List<ServicePartInput>? Parts
) : IRequest<Guid>;

public record ServicePartInput(string PartNumber, string PartName, int Quantity, decimal UnitPrice);

public class CreateServiceRecordCommandValidator : AbstractValidator<CreateServiceRecordCommand>
{
    public CreateServiceRecordCommandValidator()
    {
        RuleFor(x => x.VehicleId).NotEmpty();
        RuleFor(x => x.ServiceDate).NotEmpty().LessThanOrEqualTo(DateTime.UtcNow.AddDays(1));
        RuleFor(x => x.MileageAtService).GreaterThanOrEqualTo(0);
    }
}

public class CreateServiceRecordCommandHandler : IRequestHandler<CreateServiceRecordCommand, Guid>
{
    private readonly IApplicationDbContext _db;
    private readonly IServiceIntervalEngine _intervalEngine;
    private readonly IRetentionEngine _retentionEngine;

    public CreateServiceRecordCommandHandler(
        IApplicationDbContext db,
        IServiceIntervalEngine intervalEngine,
        IRetentionEngine retentionEngine)
    {
        _db = db;
        _intervalEngine = intervalEngine;
        _retentionEngine = retentionEngine;
    }

    public async Task<Guid> Handle(CreateServiceRecordCommand cmd, CancellationToken ct)
    {
        var nextService = await _intervalEngine.CalculateNextServiceAsync(
            cmd.VehicleId, cmd.MileageAtService, cmd.ServiceDate, ct);

        var record = new ServiceRecord
        {
            VehicleId = cmd.VehicleId,
            TechnicianId = cmd.TechnicianId,
            BayId = cmd.BayId,
            ServiceDate = cmd.ServiceDate,
            MileageAtService = cmd.MileageAtService,
            ServiceType = cmd.ServiceType,
            ServiceDescription = cmd.ServiceDescription,
            InvoiceNumber = cmd.InvoiceNumber,
            LaborCost = cmd.LaborCost,
            PartsCost = cmd.PartsCost,
            TotalCost = cmd.TotalCost ?? (cmd.LaborCost ?? 0) + (cmd.PartsCost ?? 0),
            IsWarrantyJob = cmd.IsWarrantyJob,
            IsRecallJob = cmd.IsRecallJob,
            Notes = cmd.Notes,
            NextServiceMileage = nextService.NextServiceMileage,
            NextServiceDate = nextService.NextServiceDate
        };

        if (cmd.Parts != null)
        {
            foreach (var part in cmd.Parts)
            {
                record.Parts.Add(new ServicePart
                {
                    PartNumber = part.PartNumber,
                    PartName = part.PartName,
                    Quantity = part.Quantity,
                    UnitPrice = part.UnitPrice,
                    TotalPrice = part.Quantity * part.UnitPrice
                });
            }
        }

        _db.ServiceRecords.Add(record);

        // Update vehicle service tracking fields
        var vehicle = await _db.Vehicles.FindAsync(new object[] { cmd.VehicleId }, ct);
        if (vehicle != null)
        {
            vehicle.LastServiceDate = cmd.ServiceDate;
            vehicle.LastServiceMileage = cmd.MileageAtService;
            vehicle.CurrentMileage = Math.Max(vehicle.CurrentMileage ?? 0, cmd.MileageAtService);
            vehicle.NextServiceDate = nextService.NextServiceDate;
            vehicle.NextServiceMileage = nextService.NextServiceMileage;
            vehicle.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(ct);

        // Re-evaluate retention status after new service
        await _retentionEngine.EvaluateVehicleStatusAsync(cmd.VehicleId, ct);

        return record.Id;
    }
}
