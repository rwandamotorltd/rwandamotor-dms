using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RwandaMotor.Application.Common.Models;
using RwandaMotor.Application.Features.Import.Commands;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ImportController : ControllerBase
{
    private readonly IMediator _mediator;

    public ImportController(IMediator mediator) => _mediator = mediator;

    /// <summary>
    /// Phase 1 — parse, validate, and persist an import log with row-level results.
    /// Returns a preview of the first 10 rows plus summary counts.
    /// </summary>
    [HttpPost("validate")]
    [Authorize(Policy = "CRMOfficer")]
    public async Task<IActionResult> Validate([FromBody] ValidateImportRequest request)
    {
        if (!Enum.TryParse<ImportType>(request.ImportType, ignoreCase: true, out var importType))
            return BadRequest(ApiResponse<object>.Fail($"Unknown import type: {request.ImportType}"));

        var result = await _mediator.Send(new ValidateImportFileCommand(
            request.FileName,
            request.FileContentBase64,
            importType));

        return Ok(ApiResponse<ValidateImportResultDto>.Ok(result));
    }

    /// <summary>
    /// Phase 2 — process a previously validated import log; creates entities in the database.
    /// </summary>
    [HttpPost("process/{importLogId:guid}")]
    [Authorize(Policy = "CRMOfficer")]
    public async Task<IActionResult> Process(Guid importLogId)
    {
        var result = await _mediator.Send(new ProcessImportCommand(importLogId));
        return Ok(ApiResponse<ProcessImportResultDto>.Ok(result));
    }
}

public record ValidateImportRequest(
    string FileName,
    string FileContentBase64,
    string ImportType
);
