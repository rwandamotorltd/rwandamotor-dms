using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RwandaMotor.Application.Features.Appointments.Commands;
using RwandaMotor.Application.Features.Appointments.Queries;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.API.Controllers;

[Authorize]
[ApiController]
[Route("api/appointments")]
public class AppointmentsController : ControllerBase
{
    private readonly IMediator _mediator;

    public AppointmentsController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> GetCalendar(
        [FromQuery] DateTime from, [FromQuery] DateTime to, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetAppointmentsQuery(from, to), ct);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Book([FromBody] BookAppointmentRequest req, CancellationToken ct)
    {
        var id = await _mediator.Send(new BookAppointmentCommand(
            req.VehicleId, req.CustomerId, req.FollowUpId, req.TechnicianId,
            req.AppointmentDate, req.DurationMinutes, req.ServiceType, req.Notes), ct);
        return Ok(new { id });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAppointmentRequest req, CancellationToken ct)
    {
        await _mediator.Send(new UpdateAppointmentCommand(
            id, req.AppointmentDate, req.DurationMinutes, req.ServiceType, req.TechnicianId, req.Notes), ct);
        return Ok();
    }

    [HttpPost("{id:guid}/confirm")]
    public async Task<IActionResult> Confirm(Guid id, CancellationToken ct)
    {
        await _mediator.Send(new ChangeAppointmentStatusCommand(id, AppointmentStatus.Confirmed), ct);
        return Ok();
    }

    [HttpPost("{id:guid}/complete")]
    public async Task<IActionResult> Complete(
        Guid id, [FromBody] CompleteAppointmentRequest req, CancellationToken ct)
    {
        await _mediator.Send(new ChangeAppointmentStatusCommand(
            id, AppointmentStatus.Completed, req.JobCardId), ct);
        return Ok();
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct)
    {
        await _mediator.Send(new ChangeAppointmentStatusCommand(id, AppointmentStatus.Cancelled), ct);
        return Ok();
    }

    [HttpPost("{id:guid}/no-show")]
    public async Task<IActionResult> NoShow(Guid id, CancellationToken ct)
    {
        await _mediator.Send(new ChangeAppointmentStatusCommand(id, AppointmentStatus.NoShow), ct);
        return Ok();
    }
}

public record BookAppointmentRequest(
    Guid VehicleId, Guid CustomerId, Guid? FollowUpId, Guid? TechnicianId,
    DateTime AppointmentDate, int DurationMinutes, ServiceType ServiceType, string? Notes);

public record UpdateAppointmentRequest(
    DateTime AppointmentDate, int DurationMinutes, ServiceType ServiceType,
    Guid? TechnicianId, string? Notes);

public record CompleteAppointmentRequest(Guid? JobCardId);
