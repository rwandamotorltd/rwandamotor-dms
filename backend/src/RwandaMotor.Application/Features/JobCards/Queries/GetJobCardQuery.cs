using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.JobCards.Queries;

public record GetJobCardQuery(Guid Id) : IRequest<JobCardDetailDto?>;

public class GetJobCardQueryHandler : IRequestHandler<GetJobCardQuery, JobCardDetailDto?>
{
    private readonly IApplicationDbContext _db;

    public GetJobCardQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<JobCardDetailDto?> Handle(GetJobCardQuery q, CancellationToken ct)
    {
        var j = await _db.JobCards
            .Include(x => x.Vehicle).ThenInclude(v => v.Brand)
            .Include(x => x.Vehicle).ThenInclude(v => v.Model)
            .Include(x => x.Technician)
            .Include(x => x.Customer)
            .FirstOrDefaultAsync(x => x.Id == q.Id && !x.IsDeleted, ct);

        if (j == null) return null;

        return new JobCardDetailDto(
            j.Id,
            j.JobCardNumber,
            j.VehicleId,
            j.VIN,
            j.PlateNumber,
            j.Year,
            j.Color,
            j.Transmission,
            j.FuelType,
            j.FuelLevel,
            j.Mileage,
            j.Vehicle.Brand.Name,
            j.Vehicle.Model.Name,
            j.CustomerId,
            j.CustomerName,
            j.CustomerPhone ?? j.Customer?.Phone,
            j.Customer?.Email,
            j.Customer?.Address,
            j.TechnicianId,
            j.Technician?.FullName,
            j.ServiceType,
            j.Status,
            j.Notes,
            j.AdditionalInfo,
            j.AccessoriesPresent,
            j.ReceivedByName,
            j.CreatedAt,
            j.ClosedAt,
            j.ClosedByName,
            j.DeliveryNoteNumber,
            j.DeliveryNoteGeneratedAt
        );
    }
}

public record JobCardDetailDto(
    Guid Id,
    string JobCardNumber,
    Guid VehicleId,
    string VIN,
    string? PlateNumber,
    int Year,
    string? Color,
    string? Transmission,
    string? FuelType,
    FuelLevel FuelLevel,
    int Mileage,
    string BrandName,
    string ModelName,
    Guid? CustomerId,
    string? CustomerName,
    string? CustomerPhone,
    string? CustomerEmail,
    string? CustomerAddress,
    Guid? TechnicianId,
    string? TechnicianName,
    string ServiceType,
    JobCardStatus Status,
    string? Notes,
    string? AdditionalInfo,
    List<string> AccessoriesPresent,
    string ReceivedByName,
    DateTime CreatedAt,
    DateTime? ClosedAt,
    string? ClosedByName,
    string? DeliveryNoteNumber,
    DateTime? DeliveryNoteGeneratedAt);
