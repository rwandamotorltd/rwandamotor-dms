using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.Reports.Queries;

public record GetMonthlyFollowUpReportQuery(int Year, int Month) : IRequest<MonthlyFollowUpReportDto>;

public class GetMonthlyFollowUpReportQueryHandler : IRequestHandler<GetMonthlyFollowUpReportQuery, MonthlyFollowUpReportDto>
{
    private readonly IApplicationDbContext _db;

    public GetMonthlyFollowUpReportQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<MonthlyFollowUpReportDto> Handle(GetMonthlyFollowUpReportQuery query, CancellationToken ct)
    {
        var from = new DateTime(query.Year, query.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var to   = from.AddMonths(1).AddTicks(-1);

        var followUps = await _db.FollowUps
            .Include(f => f.Interactions)
            .Include(f => f.Customer)
            .Include(f => f.Vehicle)
            .Where(f => !f.IsDeleted && f.CreatedAt >= from && f.CreatedAt <= to)
            .ToListAsync(ct);

        var appointments = await _db.Appointments
            .Where(a => !a.IsDeleted && a.AppointmentDate >= from && a.AppointmentDate <= to)
            .ToListAsync(ct);

        var allInteractions = followUps.SelectMany(f => f.Interactions).ToList();

        var totalCreated      = followUps.Count;
        var totalContacted    = followUps.Count(f => f.Interactions.Any(i => i.Outcome == InteractionOutcome.Reached));
        var totalNoAnswer     = followUps.Count(f => f.Interactions.Any() && !f.Interactions.Any(i => i.Outcome == InteractionOutcome.Reached));
        var totalApptsBooked  = appointments.Count;
        var totalCompleted    = appointments.Count(a => a.Status == AppointmentStatus.Completed);
        var totalNoShow       = appointments.Count(a => a.Status == AppointmentStatus.NoShow);
        var totalRecovered    = followUps.Count(f => f.Status == FollowUpStatus.Recovered);
        var contactRate       = totalCreated > 0 ? Math.Round((decimal)totalContacted / totalCreated * 100, 1) : 0;
        var recoveryRate      = totalContacted > 0 ? Math.Round((decimal)totalRecovered / totalContacted * 100, 1) : 0;

        // Breakdown by reason
        var byReason = followUps
            .GroupBy(f => f.Reason)
            .Select(g => new FollowUpReasonBreakdownDto(
                Reason:      g.Key,
                Total:       g.Count(),
                Contacted:   g.Count(f => f.Interactions.Any(i => i.Outcome == InteractionOutcome.Reached)),
                Appointments:g.Count(f => f.Status == FollowUpStatus.AppointmentBooked),
                Recovered:   g.Count(f => f.Status == FollowUpStatus.Recovered),
                Closed:      g.Count(f => f.Status == FollowUpStatus.Closed)
            ))
            .OrderByDescending(b => b.Total)
            .ToList();

        // Raw interaction rows for the detail table
        var rows = followUps
            .SelectMany(f => f.Interactions.Select(i => new FollowUpInteractionRowDto(
                FollowUpId:    f.Id,
                Reason:        f.Reason,
                CustomerName:  f.Customer?.FullName ?? "—",
                VehiclePlate:  f.Vehicle?.PlateNumber ?? f.Vehicle?.VIN ?? "—",
                Outcome:       i.Outcome,
                Notes:         i.Notes,
                Date:          i.CreatedAt,
                Agent:         i.CreatedBy ?? "—"
            )))
            .OrderByDescending(r => r.Date)
            .ToList();

        return new MonthlyFollowUpReportDto(
            Year: query.Year, Month: query.Month,
            TotalCreated: totalCreated, TotalContacted: totalContacted,
            TotalNoAnswer: totalNoAnswer, TotalAppointmentsBooked: totalApptsBooked,
            TotalAppointmentsCompleted: totalCompleted, TotalNoShow: totalNoShow,
            TotalRecovered: totalRecovered,
            ContactRate: contactRate, RecoveryRate: recoveryRate,
            ByReason: byReason, InteractionRows: rows
        );
    }
}

public record MonthlyFollowUpReportDto(
    int Year, int Month,
    int TotalCreated, int TotalContacted, int TotalNoAnswer,
    int TotalAppointmentsBooked, int TotalAppointmentsCompleted, int TotalNoShow,
    int TotalRecovered,
    decimal ContactRate, decimal RecoveryRate,
    List<FollowUpReasonBreakdownDto> ByReason,
    List<FollowUpInteractionRowDto> InteractionRows
);

public record FollowUpReasonBreakdownDto(
    string Reason, int Total, int Contacted, int Appointments, int Recovered, int Closed);

public record FollowUpInteractionRowDto(
    Guid FollowUpId, string Reason, string CustomerName, string VehiclePlate,
    InteractionOutcome Outcome, string? Notes, DateTime Date, string Agent);
