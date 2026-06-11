using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RwandaMotor.Application.Common.Models;
using RwandaMotor.Application.Features.Dashboard.Queries;

namespace RwandaMotor.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly IMediator _mediator;

    public DashboardController(IMediator mediator) => _mediator = mediator;

    [HttpGet("kpis")]
    [ProducesResponseType(typeof(ApiResponse<DashboardKpisDto>), 200)]
    public async Task<IActionResult> GetKpis()
    {
        var result = await _mediator.Send(new GetDashboardKpisQuery());
        return Ok(ApiResponse<DashboardKpisDto>.Ok(result));
    }
}
