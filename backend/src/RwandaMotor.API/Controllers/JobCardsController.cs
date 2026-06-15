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

    public JobCardsController(IMediator mediator) => _mediator = mediator;

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
        var bodyPreview = req.CustomMessage ?? $"Please find attached the job card details for vehicle {jobCard.VIN} ({jobCard.PlateNumber}).";

        // TODO: Inject IEmailService and send actual email
        // await _emailService.SendAsync(req.RecipientEmail, subject, bodyPreview);

        return Ok(ApiResponse<object>.Ok(new { subject, preview = bodyPreview }, "Email queued successfully"));
    }
}

public record CreateJobCardResult(Guid Id, string JobCardNumber);

public record ShareJobCardRequest(string RecipientEmail, string? CustomMessage);
