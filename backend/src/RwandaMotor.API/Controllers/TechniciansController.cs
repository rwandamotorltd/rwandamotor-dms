using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RwandaMotor.Application.Common.Models;
using RwandaMotor.Application.Features.Technicians.Commands;
using RwandaMotor.Application.Features.Technicians.Queries;

namespace RwandaMotor.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class TechniciansController : ControllerBase
{
    private readonly IMediator _mediator;

    public TechniciansController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> GetTechnicians([FromQuery] bool activeOnly = true)
    {
        var result = await _mediator.Send(new GetTechniciansQuery(activeOnly));
        return Ok(ApiResponse<List<TechnicianDto>>.Ok(result));
    }

    [HttpPost]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> CreateTechnician([FromBody] CreateTechnicianCommand command)
    {
        var id = await _mediator.Send(command);
        return Ok(ApiResponse<Guid>.Ok(id, "Technician created"));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> UpdateTechnician(Guid id, [FromBody] UpdateTechnicianCommand command)
    {
        if (id != command.Id)
            return BadRequest(ApiResponse<bool>.Fail("ID mismatch"));
        var result = await _mediator.Send(command);
        if (!result) return NotFound(ApiResponse<bool>.Fail("Technician not found"));
        return Ok(ApiResponse<bool>.Ok(true, "Technician updated"));
    }
}
