using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RwandaMotor.Application.Common.Models;
using RwandaMotor.Application.Features.Retention.Queries;

namespace RwandaMotor.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class RetentionController : ControllerBase
{
    private readonly IMediator _mediator;

    public RetentionController(IMediator mediator) => _mediator = mediator;

    [HttpGet("analytics")]
    public async Task<IActionResult> GetAnalytics(
        [FromQuery] int trendMonths = 12,
        [FromQuery] int? cohortYear = null)
    {
        var result = await _mediator.Send(new GetRetentionAnalyticsQuery(trendMonths, cohortYear));
        return Ok(ApiResponse<RetentionAnalyticsDto>.Ok(result));
    }

    [HttpGet("visit-cohorts")]
    public async Task<IActionResult> GetVisitCohorts([FromQuery] int? year = null)
    {
        var result = await _mediator.Send(new GetVisitFrequencyCohortQuery(year));
        return Ok(ApiResponse<VisitFrequencyCohortDto>.Ok(result));
    }

    [HttpGet("cohort-vehicles")]
    public async Task<IActionResult> GetCohortVehicles(
        [FromQuery] int serviceYear,
        [FromQuery] int? saleYear,
        [FromQuery] string? modelName,
        [FromQuery] string? brandName,
        [FromQuery] string visitBucket = "visited")
    {
        var result = await _mediator.Send(
            new GetCohortVehiclesQuery(serviceYear, saleYear, modelName, brandName, visitBucket));
        return Ok(ApiResponse<List<CohortVehicleDto>>.Ok(result));
    }
}
