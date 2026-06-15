using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RwandaMotor.Application.Common.Models;
using RwandaMotor.Application.Features.Vehicles.Commands;
using RwandaMotor.Application.Features.Vehicles.Queries;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class VehiclesController : ControllerBase
{
    private readonly IMediator _mediator;

    public VehiclesController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> GetVehicles(
        [FromQuery] string? search,
        [FromQuery] Guid? brandId,
        [FromQuery] Guid? modelId,
        [FromQuery] RetentionStatus? retentionStatus,
        [FromQuery] bool? isSoldByDealership,
        [FromQuery] bool? warrantyActive,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 25)
    {
        var result = await _mediator.Send(new GetVehiclesQuery(
            search, brandId, modelId, retentionStatus,
            isSoldByDealership, warrantyActive, pageNumber, pageSize));
        return Ok(ApiResponse<PaginatedResult<VehicleListItemDto>>.Ok(result));
    }

    [HttpGet("{id}/360")]
    public async Task<IActionResult> GetVehicle360(Guid id)
    {
        var result = await _mediator.Send(new GetVehicle360Query(id));
        if (result == null) return NotFound(ApiResponse<Vehicle360Dto>.Fail("Vehicle not found"));
        return Ok(ApiResponse<Vehicle360Dto>.Ok(result));
    }

    [HttpGet("brands")]
    public async Task<IActionResult> GetBrands()
    {
        var result = await _mediator.Send(new GetBrandsQuery());
        return Ok(ApiResponse<List<BrandDto>>.Ok(result));
    }

    [HttpPost]
    public async Task<IActionResult> CreateVehicle([FromBody] CreateVehicleCommand command)
    {
        var id = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetVehicle360), new { id }, ApiResponse<Guid>.Ok(id, "Vehicle created"));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,TechnicalDirector")]
    public async Task<IActionResult> UpdateVehicle(Guid id, [FromBody] UpdateVehicleCommand command)
    {
        if (id != command.Id)
            return BadRequest(ApiResponse<bool>.Fail("ID mismatch"));

        var updated = await _mediator.Send(command);
        if (!updated) return NotFound(ApiResponse<bool>.Fail("Vehicle not found"));
        return Ok(ApiResponse<bool>.Ok(true, "Vehicle updated"));
    }

    [HttpPut("bulk")]
    [Authorize(Roles = "Admin,TechnicalDirector")]
    public async Task<IActionResult> BulkUpdateVehicles([FromBody] BulkUpdateVehiclesCommand command)
    {
        var count = await _mediator.Send(command);
        return Ok(ApiResponse<int>.Ok(count, $"{count} vehicle(s) updated"));
    }

    [HttpDelete]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> DeleteVehicles([FromBody] List<Guid> ids)
    {
        if (ids == null || ids.Count == 0)
            return BadRequest(ApiResponse<int>.Fail("No IDs provided"));
        var deleted = await _mediator.Send(new DeleteVehiclesCommand(ids));
        return Ok(ApiResponse<int>.Ok(deleted, $"{deleted} vehicle(s) deleted"));
    }

    [HttpDelete("all")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> DeleteAllVehicles(
        [FromQuery] string? search,
        [FromQuery] RetentionStatus? retentionStatus,
        [FromQuery] bool? isSoldByDealership)
    {
        var deleted = await _mediator.Send(ne