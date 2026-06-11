using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.ServiceRecords.Commands;

public record UpdateServiceRecordCommand(
    Guid Id,
    int? MileageAtService,
    ServiceType? ServiceType,
    Guid? TechnicianId,
    string? InvoiceNumber,
    string? ServiceDescription,
    string? Notes,
    bool? IsWarrantyJob,
    decimal? TotalCost
) : IRequest<bool>;

public class UpdateServiceRecordCommandValidator : AbstractValidator<UpdateServiceRecordCommand>
{
    public UpdateServiceRecordCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.MileageAtService).GreaterThanOrEqualTo(0).When(x => x.MileageAtService.HasValue);
        RuleFor(x => x.InvoiceNumber).MaximumLength(100).When(x => x.InvoiceNumber != null);
        RuleFor(x => x.Notes).MaximumLength(2000).When(x => x.Notes != null);
        RuleFor(x => x.TotalCost).GreaterThanOrEqualTo(0).When(x => x.TotalCost.HasValue);
    }
}

public class UpdateServiceRecordCommandHandler : IRequestHandler<UpdateServiceRecordCommand, bool>
{
    private readonly IApplicationDbContext _db;
    private readonly IServiceIntervalEngine _intervalEngine;

    public UpdateServiceRecordCommandHandler(IApplicationDbContext db, IServiceIntervalEngine intervalEngine)
    {
        _db = db;
        _intervalEngine = intervalEngine;
    }

    public async Task<bool> Handle(UpdateServiceRecordCommand cmd, CancellationToken ct)
    {
        var record = await _db.ServiceRecords
            .Include(sr => sr.Vehicle)
            .FirstOrDefaultAsync(sr => sr.Id == cmd.Id && !sr.IsDeleted, ct);

        if (record == null) return false;

        var mileageChanged = false;

        if (cmd.MileageAtService.HasValue)
        {
            record.MileageAtService = cmd.MileageAtService.Value;
            mileageChanged = true;
        }
        if (cmd.ServiceType.HasValue)
            record.ServiceType = cmd.ServiceType.Value;
        if (cmd.TechnicianId.HasValue)
            record.TechnicianId = cmd.TechnicianId.Value;
        if (cmd.InvoiceNumber is not null)
            record.InvoiceNumber = string.IsNullOrWhiteSpace(cmd.InvoiceNumber) ? null : cmd.InvoiceNumber.Trim();
        if (cmd.ServiceDescription is not null)
            record.ServiceDescription = string.IsNullOrWhiteSpace(cmd.ServiceDescription) ? null : cmd.ServiceDescription.Trim();
        if (cmd.Notes is not null)
            record.Notes = string.IsNullOrWhiteSpace(cmd.Notes) ? null : cmd.Notes.Trim();
        if (cmd.IsWarrantyJob.HasValue)
            record.IsWarrantyJob = cmd.IsWarrantyJob.Value;
        if (cmd.TotalCost.HasValue)
            record.TotalCost = cmd.TotalCost.Value;

        record.UpdatedAt = DateTime.UtcNow;

        // Recalculate next service if mileage changed
        if (mileageChanged)
        {
            var next = await _intervalEngine.CalculateNextServiceAsync(
                record.VehicleId, record.MileageAtService, record.ServiceDate, ct);
            record.NextServiceMileage = next.NextServiceMileage;
            record.NextServiceDate    = next.NextServiceDate;

            // Update vehicle tracking if this is still the latest service
            var vehicle = record.Vehicle;
            if (!vehicle.LastServiceDate.HasValue || record.ServiceDate >= vehicle.LastServiceDate.Value)
            {
                vehicle.LastServiceDate    = record.ServiceDate;
                vehicle.LastServiceMileage = record.MileageAtService;
                vehicle.NextServiceDate    = next.NextServiceDate;
                vehicle.NextServiceMileage = next.NextServiceMileage;
                vehicle.CurrentMileage     = Math.Max(vehicle.CurrentMileage ?? 0, record.MileageAtService);
                vehicle.UpdatedAt          = DateTime.UtcNow;
            }
        }

        await _db.SaveChangesAsync(ct);
        return true;
    }
}
