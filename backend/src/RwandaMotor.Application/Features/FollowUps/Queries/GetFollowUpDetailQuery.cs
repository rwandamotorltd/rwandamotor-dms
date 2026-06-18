using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.FollowUps.Queries;

public record GetFollowUpDetailQuery(Guid FollowUpId) : IRequest<FollowUpDetailDto?>;

public class GetFollowUpDetailQueryHandler : IRequestHandler<GetFollowUpDetailQuery, FollowUpDetailDto?>
{
    private readonly IApplicationDbContext _db;

    public GetFollowUpDetailQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<FollowUpDetailDto?> Handle(GetFollowUpDetailQuery query, CancellationToken ct)
    {
        var f = await _db.FollowUps
            .Include(x => x.Vehicle).ThenInclude(v => v.Brand)
            .Include(x => x.Vehicle).ThenInclude(v => v.Model)
            .Include(x => x.Customer)
            .Include(x => x.Interactions.OrderByDescending(i => i.CreatedAt))
            .Include(x => x.Appointments.Where(a => !a.IsDeleted).OrderByDescending(a => a.AppointmentDate))
            .FirstOrDefaultAsync(x => x.Id == query.FollowUpId && !x.IsDeleted, ct);

        if (f == null) return null;

        return new FollowUpDetailDto(
            Id:             f.Id,
            Reason:         f.Reason,
            Status:         f.Status,
            Priority:       f.Priority,
            ContactMethod:  f.ContactMethod,
            DueDate:        f.DueDate,
            Notes:          f.Notes,
            CreatedAt:      f.CreatedAt,
            Vehicle: new FollowUpVehicleDto(
                Id:          f.VehicleId,
                VIN:         f.Vehicle.VIN,
                PlateNumber: f.Vehicle.PlateNumber,
                Brand:       f.Vehicle.Brand?.Name ?? "",
                Model:       f.Vehicle.Model?.Name ?? "",
                Year:        f.Vehicle.Year,
                LastServiceDate:  f.Vehicle.LastServiceDate,
                NextServiceDate:  f.Vehicle.NextServiceDate,
                RetentionStatus:  f.Vehicle.RetentionStatus
            ),
            Customer: new FollowUpCustomerDto(
                Id:    f.CustomerId,
                Name:  f.Customer.FullName,
                Phone: f.Customer.Phone,
                Email: f.Customer.Email
            ),
            Interactions: f.Interactions.Select(i => new InteractionDto(
                Id:              i.Id,
                Outcome:         i.Outcome,
                Notes:           i.Notes,
                NextContactDate: i.NextContactDate,
                EmailType:       i.EmailType,
                CreatedAt:       i.CreatedAt,
                CreatedBy:       i.CreatedBy
            )).ToList(),
            Appointments: f.Appointments.Select(a => new AppointmentSummaryDto(
                Id:              a.Id,
                AppointmentDate: a.AppointmentDate,
                DurationMinutes: a.DurationMinutes,
                ServiceType:     a.ServiceType,
                Status:          a.Status,
                Notes:           a.Notes
            )).ToList()
        );
    }
}

public record FollowUpDetailDto(
    Guid Id, string Reason, FollowUpStatus Status, FollowUpPriority Priority,
    ContactMethod ContactMethod, DateTime DueDate, string? Notes, DateTime CreatedAt,
    FollowUpVehicleDto Vehicle, FollowUpCustomerDto Customer,
    List<InteractionDto> Interactions, List<AppointmentSummaryDto> Appointments);

public record FollowUpVehicleDto(
    Guid Id, string VIN, string? PlateNumber, string Brand, string Model, int Year,
    DateTime? LastServiceDate, DateTime? NextServiceDate, RetentionStatus RetentionStatus);

public record FollowUpCustomerDto(Guid Id, string Name, string? Phone, string? Email);

public record InteractionDto(
    Guid Id, InteractionOutcome Outcome, string? Notes, DateTime? NextContactDate,
    string? EmailType, DateTime CreatedAt, string? CreatedBy);

public record AppointmentSummaryDto(
    Guid Id, DateTime AppointmentDate, int DurationMinutes,
    ServiceType ServiceType, AppointmentStatus Status, string? Notes);
