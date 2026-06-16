using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RwandaMotor.Application.Common.Models;
using RwandaMotor.Application.Features.Admin.Commands;
using RwandaMotor.Application.Features.Admin.Queries;

namespace RwandaMotor.API.Controllers;

[Authorize(Policy = "Admin")]
[ApiController]
[Route("api/[controller]")]
public class AdminController : ControllerBase
{
    private readonly IMediator _mediator;

    public AdminController(IMediator mediator) => _mediator = mediator;

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var result = await _mediator.Send(new GetUsersQuery());
        return Ok(ApiResponse<List<UserDto>>.Ok(result));
    }

    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserCommand command)
    {
        var (success, error) = await _mediator.Send(command);
        if (!success) return BadRequest(ApiResponse<bool>.Fail(error ?? "Failed to create user"));
        return Ok(ApiResponse<bool>.Ok(true, "User created successfully"));
    }

    [HttpPut("users/{id}")]
    public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserCommand command)
    {
        if (id != command.UserId)
            return BadRequest(ApiResponse<bool>.Fail("ID mismatch"));
        var (success, error) = await _mediator.Send(command);
        if (!success) return BadRequest(ApiResponse<bool>.Fail(error ?? "Failed to update user"));
        return Ok(ApiResponse<bool>.Ok(true, "User updated successfully"));
    }

    [HttpPost("users/{id}/reset-password")]
    public async Task<IActionResult> ResetPassword(string id, [FromBody] ResetPasswordRequest body)
    {
        var (success, error) = await _mediator.Send(new ResetPasswordCommand(id, body.NewPassword));
        if (!success) return BadRequest(ApiResponse<bool>.Fail(error ?? "Failed to reset password"));
        return Ok(ApiResponse<bool>.Ok(true, "Password reset successfully"));
    }

    [HttpPut("company-settings")]
    public async Task<IActionResult> UpdateCompanySettings([FromBody] UpdateCompanySettingsCommand command)
    {
        if (command is null || string.IsNullOrWhiteSpace(command.CompanyName))
            return BadRequest(ApiResponse<bool>.Fail("Company name is required"));

        await _mediator.Send(command);
        return Ok(ApiResponse<bool>.Ok(true, "Company settings updated successfully"));
    }
}

public record ResetPasswordRequest(string NewPassword);
