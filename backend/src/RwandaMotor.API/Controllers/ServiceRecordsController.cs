using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RwandaMotor.Application.Common.Models;
using RwandaMotor.Application.Features.ServiceRecords.Commands;
using RwandaMotor.Application.Features.ServiceRecords.Queries;

namespace RwandaMotor.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ServiceRecordsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ServiceRecordsController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> GetServiceRecords(
        [FromQuery] Guid? vehicleId,
        [FromQuery] Guid? technicianId,
        [FromQuery] Guid? bayId,
        [FromQuery] string? serviceType,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        [FromQuery] string? search,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 25)
    {
        var result = await _mediator.Send(new GetServiceRecordsQuery(
            vehicleId, null, technicianId, bayId,
            serviceType, dateFrom, dateTo, search, pageNumber, pageSize));
        return Ok(ApiResponse<PaginatedResult<ServiceRecordListItemDto>>.Ok(result));
    }

    [HttpPost]
    [Authorize(Policy = "TechnicalDirector")]
    public async Task<IActionResult> CreateServiceRecord([FromBody] CreateServiceRecordCommand command)
    {
        var id = await _mediator.Send(command);
        return Ok(ApiResponse<Guid>.Ok(id, "Service record created"));
    }

    /// <summary>
    /// Allows CRE (and Admin/TechnicalDirector) to complete missing fields on an
    /// imported service record — mileage, service type, technician, invoice, notes, etc.
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = "CRE")]
    public async Task<IActionResult> UpdateServiceRecord(Guid id, [FromBody] UpdateServiceRecordCommand command)
    {
        if (id != command.Id)
            return BadRequest(ApiResponse<bool>.Fail("ID mismatch"));
        var updated = await _mediator.Send(command);
        if (!updated) return NotFound(ApiResponse<bool>.Fail("Service record not found"));
        return Ok(ApiResponse<bool>.Ok(true, "Service record updated"));
    }

    [HttpDelete]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> DeleteServiceRecords([FromBody] List<Guid> ids)
    {
        if (ids == null || ids.Count == 0)
            return BadRequest(ApiResponse<int>.Fail("No IDs provided"));
        var deleted = await _mediator.Send(new DeleteServiceRecordsCommand(ids));
        return Ok(ApiResponse<int>.Ok(deleted, $"{deleted} record(s) deleted"));
    }

    [HttpDelete("all")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> DeleteAllServiceRecords(
        [FromQuery] string? search,
        [FromQuery] string? serviceType,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo)
    {
        var deleted = await _mediator.Send(new DeleteAllServiceRecordsCommand(search, serviceType, dateFrom, dateTo));
        return Ok(ApiResponse<int>.Ok(deleted, $"{deleted} record(s) deleted"));
    }
}
