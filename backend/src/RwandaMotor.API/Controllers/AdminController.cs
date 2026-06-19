using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RwandaMotor.Application.Common.Models;
using RwandaMotor.Application.Features.Admin.Commands;
using RwandaMotor.Application.Features.Admin.Queries;
using RwandaMotor.Application.Features.Vehicles.Queries;

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

    // ── Catalogue — Brands ────────────────────────────────────────────────────

    [HttpGet("catalogue/brands")]
    public async Task<IActionResult> GetCatalogueBrands()
    {
        var result = await _mediator.Send(new GetCatalogueBrandsQuery());
        return Ok(ApiResponse<List<CatalogueBrandDto>>.Ok(result));
    }

    [HttpPost("catalogue/brands")]
    public async Task<IActionResult> CreateBrand([FromBody] CreateBrandRequest req)
    {
        var id = await _mediator.Send(new CreateBrandCommand(req.Name, req.Code, req.Country));
        return Ok(ApiResponse<Guid>.Ok(id, "Brand created"));
    }

    [HttpPut("catalogue/brands/{id:guid}")]
    public async Task<IActionResult> UpdateBrand(Guid id, [FromBody] UpdateBrandRequest req)
    {
        var ok = await _mediator.Send(new UpdateBrandCommand(id, req.Name, req.Code, req.Country, req.IsActive));
        return ok ? Ok(ApiResponse<bool>.Ok(true)) : NotFound(ApiResponse<bool>.Fail("Brand not found"));
    }

    [HttpDelete("catalogue/brands/{id:guid}")]
    public async Task<IActionResult> DeleteBrand(Guid id)
    {
        var ok = await _mediator.Send(new DeleteBrandCommand(id));
        return ok ? Ok(ApiResponse<bool>.Ok(true)) : NotFound(ApiResponse<bool>.Fail("Brand not found"));
    }

    // ── Catalogue — Models ────────────────────────────────────────────────────

    [HttpPost("catalogue/brands/{brandId:guid}/models")]
    public async Task<IActionResult> CreateModel(Guid brandId, [FromBody] CreateModelRequest req)
    {
        var id = await _mediator.Send(new CreateVehicleModelCommand(brandId, req.Name, req.Code, req.Segment));
        return Ok(ApiResponse<Guid>.Ok(id, "Model created"));
    }

    [HttpPut("catalogue/models/{id:guid}")]
    public async Task<IActionResult> UpdateModel(Guid id, [FromBody] UpdateModelRequest req)
    {
        var ok = await _mediator.Send(new UpdateVehicleModelCommand(id, req.Name, req.Code, req.Segment, req.IsActive));
        return ok ? Ok(ApiResponse<bool>.Ok(true)) : NotFound(ApiResponse<bool>.Fail("Model not found"));
    }

    [HttpDelete("catalogue/models/{id:guid}")]
    public async Task<IActionResult> DeleteModel(Guid id)
    {
        var ok = await _mediator.Send(new DeleteVehicleModelCommand(id));
        return ok ? Ok(ApiResponse<bool>.Ok(true)) : NotFound(ApiResponse<bool>.Fail("Model not found"));
    }

    [HttpPost("catalogue/import")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> ImportCatalogue([FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(ApiResponse<BulkImportCatalogueResultDto>.Fail("No file uploaded"));

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);

        var result = await _mediator.Send(new BulkImportCatalogueCommand(ms.ToArray(), file.FileName));
        return Ok(ApiResponse<BulkImportCatalogueResultDto>.Ok(result));
    }
}

public record ResetPasswordRequest(string NewPassword);
public record CreateBrandRequest(string Name, string Code, string? Country);
public record UpdateBrandRequest(string Name, string Code, string? Country, bool IsActive);
public record CreateModelRequest(string Name, string Code, string? Segment);
public record UpdateModelRequest(string Name, string Code, string? Segment, bool IsActive);
