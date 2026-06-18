using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RwandaMotor.Application.Features.FollowUps.Commands;
using RwandaMotor.Application.Features.FollowUps.Queries;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.API.Controllers;

[Authorize]
[ApiController]
[Route("api/follow-ups")]
public class FollowUpsController : ControllerBase
{
    private readonly IMediator _mediator;

    public FollowUpsController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? reason,
        [FromQuery] FollowUpStatus? status,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize   = 30,
        CancellationToken ct = default)
    {
        var result = await _mediator.Send(new GetFollowUpsQuery(reason, status, pageNumber, pageSize), ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetDetail(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetFollowUpDetailQuery(id), ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("{id:guid}/interactions")]
    public async Task<IActionResult> LogInteraction(
        Guid id, [FromBody] LogInteractionRequest req, CancellationToken ct)
    {
        await _mediator.Send(new LogFollowUpInteractionCommand(
            id, req.Outcome, req.Notes, req.NextContactDate), ct);
        return Ok();
    }

    [HttpPost("{id:guid}/send-email")]
    public async Task<IActionResult> SendEmail(
        Guid id, [FromBody] SendEmailRequest req, CancellationToken ct)
    {
        await _mediator.Send(new SendFollowUpEmailCommand(id, req.EmailType), ct);
        return Ok();
    }

    [HttpPost("{id:guid}/close")]
    public async Task<IActionResult> Close(
        Guid id, [FromBody] CloseRequest req, CancellationToken ct)
    {
        await _mediator.Send(new CloseFollowUpCommand(id, req.Notes), ct);
        return Ok();
    }
}

public record LogInteractionRequest(InteractionOutcome Outcome, string? Notes, DateTime? NextContactDate);
public record SendEmailRequest(string EmailType);
public record CloseRequest(string? Notes);
