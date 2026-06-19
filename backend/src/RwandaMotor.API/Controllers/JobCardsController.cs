using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Application.Common.Models;
using RwandaMotor.Application.Features.JobCards.Commands;
using RwandaMotor.Application.Features.JobCards.Queries;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class JobCardsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IEmailService _email;

    public JobCardsController(IMediator mediator, IEmailService email)
    {
        _mediator = mediator;
        _email = email;
    }

    // ──────────────────────────────────────────────────────────────
    // LIST
    // ──────────────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetJobCards(
        [FromQuery] string? search,
        [FromQuery] JobCardStatus? status,
        [FromQuery] ServiceType? serviceType,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 25)
    {
        var result = await _mediator.Send(new GetJobCardsQuery(search, status, serviceType, dateFrom, dateTo, pageNumber, pageSize));
        return Ok(ApiResponse<PaginatedResult<JobCardListItemDto>>.Ok(result));
    }

    // ──────────────────────────────────────────────────────────────
    // GET DETAIL
    // ──────────────────────────────────────────────────────────────
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetJobCard(Guid id)
    {
        var result = await _mediator.Send(new GetJobCardQuery(id));
        if (result == null) return NotFound(ApiResponse<object>.Fail("Job card not found"));
        return Ok(ApiResponse<JobCardDetailDto>.Ok(result));
    }

    // ──────────────────────────────────────────────────────────────
    // CREATE
    // ──────────────────────────────────────────────────────────────
    [HttpPost]
    public async Task<IActionResult> CreateJobCard([FromBody] CreateJobCardCommand command)
    {
        var (id, number) = await _mediator.Send(command);
        return Ok(ApiResponse<CreateJobCardResult>.Ok(new CreateJobCardResult(id, number), "Job card created"));
    }

    // ──────────────────────────────────────────────────────────────
    // UPDATE (Open job cards only)
    // ──────────────────────────────────────────────────────────────
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateJobCard(Guid id, [FromBody] UpdateJobCardCommand command)
    {
        if (id != command.Id)
            return BadRequest(ApiResponse<bool>.Fail("ID mismatch"));
        try
        {
            await _mediator.Send(command);
            return Ok(ApiResponse<bool>.Ok(true, "Job card updated"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<bool>.Fail(ex.Message));
        }
    }

    // ──────────────────────────────────────────────────────────────
    // CONVERT TO DELIVERY NOTE
    // ──────────────────────────────────────────────────────────────
    [HttpPost("{id:guid}/convert")]
    public async Task<IActionResult> ConvertToDeliveryNote(Guid id)
    {
        var dnNumber = await _mediator.Send(new ConvertToDeliveryNoteCommand(id));
        return Ok(ApiResponse<string>.Ok(dnNumber, $"Converted to delivery note {dnNumber}"));
    }

    // ──────────────────────────────────────────────────────────────
    // SEQUENCE MANAGEMENT (Admin only)
    // ──────────────────────────────────────────────────────────────
    [HttpPut("sequence")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> UpdateSequence([FromBody] UpdateJobCardSequenceCommand command)
    {
        var ok = await _mediator.Send(command);
        return Ok(ApiResponse<bool>.Ok(ok, "Sequence updated"));
    }

    // ──────────────────────────────────────────────────────────────
    // SHARE VIA EMAIL
    // ──────────────────────────────────────────────────────────────
    [HttpPost("{id:guid}/share")]
    public async Task<IActionResult> ShareViaEmail(Guid id, [FromBody] ShareJobCardRequest req)
    {
        var jobCard = await _mediator.Send(new GetJobCardQuery(id));
        if (jobCard == null) return NotFound(ApiResponse<object>.Fail("Job card not found"));

        // Simple log for now — wire to SMTP/SendGrid in production
        // The frontend handles the actual email composition for delivery notes
        // This endpoint records the sharing intent and returns success
        var subject = $"Job Card {jobCard.JobCardNumber} — {jobCard.VIN}";
        var html = JobCardEmailBuilder.BuildShareEmail(jobCard, req.CustomMessage);
        await _email.SendAsync(req.RecipientEmail, subject, html);
        return Ok(ApiResponse<object>.Ok(new { subject }, "Email sent successfully"));
    }
}

public record CreateJobCardResult(Guid Id, string JobCardNumber);

public record ShareJobCardRequest(string RecipientEmail, string? CustomMessage);

file static class JobCardEmailBuilder
{
    private static string E(string? s) => System.Net.WebUtility.HtmlEncode(s ?? "—");
    private const string TD = "padding:8px 0;border-bottom:1px solid #eee";
    private const string TDL = "padding:8px 0;border-bottom:1px solid #eee;color:#666;width:40%";

    internal static string BuildShareEmail(JobCardDetailDto jc, string? customMessage)
    {
        var msg = E(customMessage ?? $"Please find the job card details for vehicle {jc.VIN}.");
        var notesRow = string.IsNullOrWhiteSpace(jc.Notes)
            ? ""
            : $"<tr><td style='{TDL}'>Notes</td><td style='{TD};font-weight:500'>{E(jc.Notes)}</td></tr>";

        return "<html><head><meta charset='utf-8'></head>"
            + "<body style='font-family:Arial,sans-serif;color:#1a1a1a;margin:0;padding:20px;background:#f5f5f5'>"
            + "<div style='background:#fff;border-radius:8px;padding:32px;max-width:600px;margin:0 auto'>"
            + $"<h1 style='font-size:20px;margin:0 0 4px;color:#111'>Job Card {E(jc.JobCardNumber)}</h1>"
            + "<p style='color:#666;font-size:14px;margin:0 0 24px'>Rwanda Motor Ltd &mdash; Service Department</p>"
            + $"<div style='background:#f0f4ff;border-left:3px solid #3b5bdb;padding:12px 16px;border-radius:4px;margin:20px 0;font-size:14px'>{msg}</div>"
            + "<table style='width:100%;border-collapse:collapse;font-size:14px'>"
            + $"<tr><td style='{TDL}'>VIN</td><td style='{TD};font-weight:500'>{E(jc.VIN)}</td></tr>"
            + $"<tr><td style='{TDL}'>Plate Number</td><td style='{TD};font-weight:500'>{E(jc.PlateNumber)}</td></tr>"
            + $"<tr><td style='{TDL}'>Vehicle</td><td style='{TD};font-weight:500'>{E($"{jc.Year} {jc.BrandName} {jc.ModelName}")}</td></tr>"
            + $"<tr><td style='{TDL}'>Customer</td><td style='{TD};font-weight:500'>{E(jc.CustomerName)}</td></tr>"
            + $"<tr><td style='{TDL}'>Service Type</td><td style='{TD};font-weight:500'>{E(jc.ServiceType.ToString())}</td></tr>"
            + $"<tr><td style='{TDL}'>Mileage In</td><td style='{TD};font-weight:500'>{jc.Mileage:N0} km</td></tr>"
            + $"<tr><td style='{TDL}'>Technician</td><td style='{TD};font-weight:500'>{E(jc.TechnicianName)}</td></tr>"
            + $"<tr><td style='{TDL}'>Status</td><td style='{TD};font-weight:500'>{jc.Status}</td></tr>"
            + notesRow
            + "</table>"
            + "<p style='margin-top:24px;font-size:12px;color:#999;text-align:center'>Rwanda Motor Ltd &middot; Sent from the DMS system</p>"
            + "</div></body></html>";
    }
}
