using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RwandaMotor.Application.Common.Models;
using RwandaMotor.Application.Features.Activity.Queries;

namespace RwandaMotor.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ActivityController : ControllerBase
{
    private readonly IMediator _mediator;
    public ActivityController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> GetActivityLog(
        [FromQuery] string? userId,
        [FromQuery] string? entityType,
        [FromQuery] string? action,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize   = 50)
    {
        var result = await _mediator.Send(new GetActivityLogQuery(
            userId, entityType, action, dateFrom, dateTo, pageNumber, pageSize));
        return Ok(ApiResponse<PaginatedResult<ActivityLogDto>>.Ok(result));
    }
}
