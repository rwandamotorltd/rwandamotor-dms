using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Application.Common.Models;
using RwandaMotor.Application.Features.Retention.Queries;

namespace RwandaMotor.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class RetentionController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IRetentionEngine _engine;

    public RetentionController(IMediator mediator, IRetentionEngine engine)
    {
        _mediator = mediator;
        _engine = engine;
    }

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

    [HttpPost("evaluate")]
    [Authorize(Roles = "Admin,TechnicalDirector")]
    public async Task<IActionResult> EvaluateNow(CancellationToken ct)
    {
        await _engine.EvaluateAllVehiclesAsync(ct);
        return Ok(ApiResponse<bool>.Ok(true, "Fleet status updated"));
    }
}
