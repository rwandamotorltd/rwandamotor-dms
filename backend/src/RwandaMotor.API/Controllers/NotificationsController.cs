using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RwandaMotor.Application.Features.Notifications.Commands;
using RwandaMotor.Application.Features.Notifications.Queries;

namespace RwandaMotor.API.Controllers;

[Authorize]
[ApiController]
[Route("api/notifications")]
public class NotificationsController : ControllerBase
{
    private readonly IMediator _mediator;

    public NotificationsController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 30, CancellationToken ct = default)
    {
        var result = await _mediator.Send(new GetNotificationsQuery(page, pageSize), ct);
        return Ok(result);
    }

    [HttpPost("mark-read")]
    public async Task<IActionResult> MarkRead(
        [FromBody] MarkReadRequest req, CancellationToken ct)
    {
        await _mediator.Send(new MarkNotificationsReadCommand(req.NotificationIds), ct);
        return Ok();
    }
}

public record MarkReadRequest(List<Guid>? NotificationIds);
