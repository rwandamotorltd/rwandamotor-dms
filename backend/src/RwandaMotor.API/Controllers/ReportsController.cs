using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RwandaMotor.Application.Features.Reports.Queries;
using RwandaMotor.Infrastructure.Reports;

namespace RwandaMotor.API.Controllers;

[Authorize]
[ApiController]
[Route("api/reports")]
public class ReportsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ReportsController(IMediator mediator) => _mediator = mediator;

    [HttpGet("follow-ups")]
    public async Task<IActionResult> GetFollowUpReport(
        [FromQuery] int year, [FromQuery] int month, CancellationToken ct)
    {
        var report = await _mediator.Send(new GetMonthlyFollowUpReportQuery(year, month), ct);
        return Ok(report);
    }

    [HttpGet("follow-ups/pdf")]
    public async Task<IActionResult> DownloadPdf(
        [FromQuery] int year, [FromQuery] int month, CancellationToken ct)
    {
        var report = await _mediator.Send(new GetMonthlyFollowUpReportQuery(year, month), ct);
        var pdf    = FollowUpReportPdfBuilder.Build(report);
        var name   = $"followup-report-{year}-{month:D2}.pdf";
        return File(pdf, "application/pdf", name);
    }

    [HttpGet("follow-ups/excel")]
    public async Task<IActionResult> DownloadExcel(
        [FromQuery] int year, [FromQuery] int month, CancellationToken ct)
    {
        var report = await _mediator.Send(new GetMonthlyFollowUpReportQuery(year, month), ct);
        var xlsx   = FollowUpReportExcelBuilder.Build(report);
        var name   = $"followup-report-{year}-{month:D2}.xlsx";
        return File(xlsx, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", name);
    }
}
