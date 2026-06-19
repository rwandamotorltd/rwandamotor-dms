using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.Appointments.Queries;

public record GetAppointmentsQuery(DateTime From, DateTime To) : IRequest<List<AppointmentDto>>;

public class GetAppointmentsQueryHandler : IRequestHandler<GetAppointmentsQuery, List<AppointmentDto>>
{
    private readonly IApplicationDbContext _db;

    public GetAppointmentsQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<List<AppointmentDto>> Handle(GetAppointmentsQuery query, CancellationToken ct)
    {
        var appts = await _db.Appointments
            .Include(a => a.Vehicle).ThenInclude(v => v.Brand)
            .Include(a => a.Vehicle).ThenInclude(v => v.Model)
            .Include(a => a.Customer)
            .Include(a => a.Technician)
            .Where(a => !a.IsDeleted
                && a.AppointmentDate >= query.From
                && a.AppointmentDate <= query.To)
            .OrderBy(a => a.AppointmentDate)
            .ToListAsync(ct);

        return appts.Select(a => new AppointmentDto(
            Id:              a.Id,
            VehicleId:       a.VehicleId,
            CustomerId:      a.CustomerId,
            FollowUpId:      a.FollowUpId,
            TechnicianId:    a.TechnicianId,
            AppointmentDate: a.AppointmentDate,
            DurationMinutes: a.DurationMinutes,
            ServiceType:     a.ServiceType,
            Status:          a.Status,
            Notes:           a.Notes,
            VehiclePlate:    a.Vehicle.PlateNumber ?? a.Vehicle.VIN,
            VehicleLabel:    $"{a.Vehicle.Brand?.Name} {a.Vehicle.Model?.Name}".Trim(),
            CustomerName:    a.Customer.FullName,
            CustomerPhone:   a.Customer.Phone,
            TechnicianName:  a.Technician?.FullName,
            ConfirmedAt:     a.ConfirmedAt,
            CompletedAt:     a.CompletedAt
        )).ToList();
    }
}

public record AppointmentDto(
    Guid Id, Guid VehicleId, Guid CustomerId, Guid? FollowUpId, Guid? TechnicianId,
    DateTime AppointmentDate, int DurationMinutes, ServiceType ServiceType, AppointmentStatus Status,
    string? Notes, string VehiclePlate, string VehicleLabel, string CustomerName,
    string? CustomerPhone, string? TechnicianName, DateTime? ConfirmedAt, DateTime? CompletedAt);
