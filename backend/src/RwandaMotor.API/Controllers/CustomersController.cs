using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RwandaMotor.Application.Common.Models;
using RwandaMotor.Application.Features.Customers.Commands;
using RwandaMotor.Application.Features.Customers.Queries;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class CustomersController : ControllerBase
{
    private readonly IMediator _mediator;

    public CustomersController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> GetCustomers(
        [FromQuery] string? search,
        [FromQuery] CustomerCategory? category,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 25)
    {
        var result = await _mediator.Send(new GetCustomersQuery(search, category, pageNumber, pageSize));
        return Ok(ApiResponse<PaginatedResult<CustomerListItemDto>>.Ok(result));
    }

    [HttpPost]
    public async Task<IActionResult> CreateCustomer([FromBody] CreateCustomerCommand command)
    {
        var id = await _mediator.Send(command);
        return Ok(ApiResponse<Guid>.Ok(id, "Customer created"));
    }

    [HttpGet("{id:guid}/360")]
    public async Task<IActionResult> GetCustomer360(Guid id)
    {
        var result = await _mediator.Send(new GetCustomer360Query(id));
        if (result == null) return NotFound(ApiResponse<bool>.Fail("Customer not found"));
        return Ok(ApiResponse<Customer360Dto>.Ok(result));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateCustomer(Guid id, [FromBody] UpdateCustomerCommand command)
    {
        if (id != command.Id)
            return BadRequest(ApiResponse<bool>.Fail("ID mismatch"));
        var result = await _mediator.Send(command);
        return Ok(ApiResponse<bool>.Ok(result, "Customer updated"));
    }

    [HttpDelete]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> DeleteCustomers([FromBody] List<Guid> ids)
    {
        if (ids == null || ids.Count == 0)
            return BadRequest(ApiResponse<int>.Fail("No IDs provided"));
        var deleted = await _mediator.Send(new DeleteCustomersCommand(ids));
        return Ok(ApiResponse<int>.Ok(deleted, $"{deleted} customer(s) deleted"));
    }

    /// <summary>
    /// Deletes ALL customers matching the given filters — no pagination, no IDs.
    /// Reserved for Admins.
    /// </summary>
    [HttpDelete("all")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> DeleteAllCustomers(
        [FromQuery] string? search,
        [FromQuery] CustomerCategory? category)
    {
        var deleted = await _mediator.Send(new DeleteAllCustomersCommand(search, category));
        return Ok(ApiResponse<int>.Ok(deleted, $"{deleted} customer(s) deleted"));
    }
}
