using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Application.Common.Models;
using RwandaMotor.Application.Features.Admin.Commands;
using RwandaMotor.Application.Features.Admin.Queries;
using RwandaMotor.Application.Features.Templates.Commands;
using RwandaMotor.Application.Features.Templates.Queries;
using RwandaMotor.Application.Features.Vehicles.Queries;
using RwandaMotor.Domain.Entities;

namespace RwandaMotor.API.Controllers;

[Authorize(Policy = "Admin")]
[ApiController]
[Route("api/[controller]")]
public class AdminController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IApplicationDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;

    public AdminController(IMediator mediator, IApplicationDbContext db,
        UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager)
    {
        _mediator = mediator;
        _db = db;
        _userManager = userManager;
        _roleManager = roleManager;
    }

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

    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(string id)
    {
        var (success, error) = await _mediator.Send(new DeleteUserCommand(id));
        if (!success) return BadRequest(ApiResponse<bool>.Fail(error ?? "Failed to delete user"));
        return Ok(ApiResponse<bool>.Ok(true, "User deleted"));
    }

    [HttpPut("company-settings")]
    public async Task<IActionResult> UpdateCompanySettings([FromBody] UpdateCompanySettingsCommand command)
    {
        if (command is null || string.IsNullOrWhiteSpace(command.CompanyName))
            return BadRequest(ApiResponse<bool>.Fail("Company name is required"));

        await _mediator.Send(command);
        return Ok(ApiResponse<bool>.Ok(true, "Company settings updated successfully"));
    }

    // ── Brand Colors ──────────────────────────────────────────────────────────

    [HttpGet("brand-colors")]
    public async Task<IActionResult> GetBrandColors()
    {
        var result = await _mediator.Send(new GetBrandColorsQuery());
        return Ok(ApiResponse<List<BrandColorDto>>.Ok(result));
    }

    [HttpPost("brand-colors")]
    public async Task<IActionResult> CreateBrandColor([FromBody] CreateBrandColorCommand command)
    {
        var result = await _mediator.Send(command);
        return Ok(ApiResponse<BrandColorDto>.Ok(result, "Color created"));
    }

    [HttpPut("brand-colors/{id:guid}")]
    public async Task<IActionResult> UpdateBrandColor(Guid id, [FromBody] UpdateBrandColorCommand command)
    {
        if (id != command.Id) return BadRequest(ApiResponse<bool>.Fail("ID mismatch"));
        var (success, error) = await _mediator.Send(command);
        if (!success) return BadRequest(ApiResponse<bool>.Fail(error ?? "Failed"));
        return Ok(ApiResponse<bool>.Ok(true));
    }

    [HttpDelete("brand-colors/{id:guid}")]
    public async Task<IActionResult> DeleteBrandColor(Guid id)
    {
        var (success, error) = await _mediator.Send(new DeleteBrandColorCommand(id));
        if (!success) return BadRequest(ApiResponse<bool>.Fail(error ?? "Failed"));
        return Ok(ApiResponse<bool>.Ok(true));
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

    [HttpPost("catalogue/preview")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> PreviewCatalogue([FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(ApiResponse<CataloguePreviewResultDto>.Fail("No file uploaded"));

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);

        var result = await _mediator.Send(new PreviewCatalogueImportCommand(ms.ToArray(), file.FileName));
        return Ok(ApiResponse<CataloguePreviewResultDto>.Ok(result));
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

    // ── Document Templates ──────────────────────────────────────────────────

    [HttpGet("templates")]
    public async Task<IActionResult> GetTemplates([FromQuery] string? documentType = null)
    {
        var list = await _mediator.Send(new GetTemplatesQuery(documentType));
        return Ok(ApiResponse<List<TemplateDto>>.Ok(list));
    }

    [HttpPost("templates")]
    public async Task<IActionResult> SaveTemplate([FromBody] SaveTemplateCommand command)
    {
        var dto = await _mediator.Send(command);
        return Ok(ApiResponse<TemplateDto>.Ok(dto));
    }

    [HttpDelete("templates/{id:guid}")]
    public async Task<IActionResult> DeleteTemplate(Guid id)
    {
        var ok = await _mediator.Send(new DeleteTemplateCommand(id));
        return ok ? Ok(ApiResponse<bool>.Ok(true)) : NotFound(ApiResponse<bool>.Fail("Template not found"));
    }

    // ── Roles ─────────────────────────────────────────────────────────────────

    [HttpGet("roles")]
    public async Task<IActionResult> GetRoles()
    {
        var roles = await _db.AppRoles.OrderBy(r => r.IsBuiltIn ? 0 : 1).ThenBy(r => r.Name).ToListAsync();
        var users = await _userManager.Users.Select(u => new { u.Role }).ToListAsync();
        var counts = users.GroupBy(u => u.Role ?? "").ToDictionary(g => g.Key, g => g.Count());

        var dtos = roles.Select(r => new RoleDto(
            r.Id, r.Name, r.DisplayName, r.Description, r.IsBuiltIn,
            counts.GetValueOrDefault(r.Name, 0)
        )).ToList();
        return Ok(ApiResponse<List<RoleDto>>.Ok(dtos));
    }

    [HttpPost("roles")]
    public async Task<IActionResult> CreateRole([FromBody] CreateRoleRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name) || string.IsNullOrWhiteSpace(req.DisplayName))
            return BadRequest(ApiResponse<bool>.Fail("Name and DisplayName are required"));

        var nameTrimmed = req.Name.Trim().Replace(" ", "");
        if (await _db.AppRoles.AnyAsync(r => r.Name == nameTrimmed))
            return BadRequest(ApiResponse<bool>.Fail("A role with that name already exists"));

        try
        {
            var role = new AppRole
            {
                Name = nameTrimmed,
                DisplayName = req.DisplayName.Trim(),
                Description = req.Description?.Trim(),
                IsBuiltIn = false,
            };
            _db.AppRoles.Add(role);
            await _db.SaveChangesAsync();

            // Mirror into ASP.NET Identity so UserManager.AddToRoleAsync can resolve it
            if (!await _roleManager.RoleExistsAsync(nameTrimmed))
                await _roleManager.CreateAsync(new IdentityRole(nameTrimmed));

            return Ok(ApiResponse<RoleDto>.Ok(new RoleDto(role.Id, role.Name, role.DisplayName, role.Description, false, 0)));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<bool>.Fail(ex.InnerException?.Message ?? ex.Message));
        }
    }

    [HttpPut("roles/{id:guid}")]
    public async Task<IActionResult> UpdateRole(Guid id, [FromBody] UpdateRoleRequest req)
    {
        var role = await _db.AppRoles.FindAsync(id);
        if (role is null) return NotFound(ApiResponse<bool>.Fail("Role not found"));

        role.DisplayName = req.DisplayName.Trim();
        role.Description = req.Description?.Trim();
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<bool>.Ok(true));
    }

    [HttpDelete("roles/{id:guid}")]
    public async Task<IActionResult> DeleteRole(Guid id)
    {
        var role = await _db.AppRoles.FindAsync(id);
        if (role is null) return NotFound(ApiResponse<bool>.Fail("Role not found"));
        if (role.IsBuiltIn) return BadRequest(ApiResponse<bool>.Fail("Built-in roles cannot be deleted"));

        var inUse = await _userManager.Users.AnyAsync(u => u.Role == role.Name);
        if (inUse) return BadRequest(ApiResponse<bool>.Fail("Cannot delete a role that is assigned to users"));

        _db.AppRoles.Remove(role);
        await _db.SaveChangesAsync();

        // Remove from Identity as well
        var identityRole = await _roleManager.FindByNameAsync(role.Name);
        if (identityRole != null) await _roleManager.DeleteAsync(identityRole);

        return Ok(ApiResponse<bool>.Ok(true));
    }

    // ── Data Purge ────────────────────────────────────────────────────────────

    [HttpPost("purge-data")]
    public async Task<IActionResult> PurgeData(CancellationToken ct)
    {
        // Hard-delete all operational/transactional data in FK-safe order.
        // Preserved: Users, CompanySettings, ServicePolicies, Brands, VehicleModels,
        //            Technicians, WorkshopBays, PermissionGroups, AppRoles, DocumentTemplates.
        await _db.ServiceParts.IgnoreQueryFilters().ExecuteDeleteAsync(ct);
        await _db.ImportLogRows.IgnoreQueryFilters().ExecuteDeleteAsync(ct);
        await _db.ServiceRecords.IgnoreQueryFilters().ExecuteDeleteAsync(ct);
        await _db.SalesHistories.IgnoreQueryFilters().ExecuteDeleteAsync(ct);
        await _db.FollowUpInteractions.IgnoreQueryFilters().ExecuteDeleteAsync(ct);
        await _db.FollowUps.IgnoreQueryFilters().ExecuteDeleteAsync(ct);
        await _db.Appointments.IgnoreQueryFilters().ExecuteDeleteAsync(ct);
        await _db.Notifications.IgnoreQueryFilters().ExecuteDeleteAsync(ct);
        await _db.JobCards.IgnoreQueryFilters().ExecuteDeleteAsync(ct);
        await _db.ImportLogs.IgnoreQueryFilters().ExecuteDeleteAsync(ct);
        await _db.AuditLogs.IgnoreQueryFilters().ExecuteDeleteAsync(ct);
        await _db.Vehicles.IgnoreQueryFilters().ExecuteDeleteAsync(ct);
        await _db.Customers.IgnoreQueryFilters().ExecuteDeleteAsync(ct);
        await _db.JobCardSequences.IgnoreQueryFilters().ExecuteDeleteAsync(ct);

        return Ok(ApiResponse<bool>.Ok(true, "All operational data has been purged."));
    }
}

public record ResetPasswordRequest(string NewPassword);
public record CreateBrandRequest(string Name, string Code, string? Country);
public record UpdateBrandRequest(string Name, string Code, string? Country, bool IsActive);
public record CreateModelRequest(string Name, string Code, string? Segment);
public record UpdateModelRequest(string Name, string Code, string? Segment, bool IsActive);
public record RoleDto(Guid Id, string Name, string DisplayName, string? Description, bool IsBuiltIn, int UserCount);
public record CreateRoleRequest(string Name, string DisplayName, string? Description);
public record UpdateRoleRequest(string DisplayName, string? Description);
