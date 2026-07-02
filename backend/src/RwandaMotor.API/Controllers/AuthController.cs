using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Application.Common.Models;
using RwandaMotor.Application.Common.Permissions;
using RwandaMotor.Application.Features.Auth.Commands;
using RwandaMotor.Domain.Entities;

namespace RwandaMotor.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IJwtService _jwtService;
    private readonly ICurrentUserService _currentUser;
    private readonly IApplicationDbContext _db;

    public AuthController(
        IMediator mediator,
        UserManager<ApplicationUser> userManager,
        IJwtService jwtService,
        ICurrentUserService currentUser,
        IApplicationDbContext db)
    {
        _mediator = mediator;
        _userManager = userManager;
        _jwtService = jwtService;
        _currentUser = currentUser;
        _db = db;
    }

    [HttpPost("login")]
    [ProducesResponseType(typeof(ApiResponse<AuthResponseDto>), 200)]
    [ProducesResponseType(401)]
    public async Task<IActionResult> Login([FromBody] LoginCommand command)
    {
        var result = await _mediator.Send(command);
        return Ok(ApiResponse<AuthResponseDto>.Ok(result, "Login successful"));
    }

    /// <summary>
    /// Re-issues a fresh JWT for the currently logged-in user.
    /// Call this after updating user details so the new name is reflected immediately.
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var userId = _currentUser.UserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var user = await _userManager.FindByIdAsync(userId);
        if (user is null || !user.IsActive) return Unauthorized();

        var roles = await _userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? string.Empty;
        var accessToken = _jwtService.GenerateAccessToken(user, roles);

        List<string> permissions;
        if (user.CustomPermissions.Count > 0)
            permissions = user.CustomPermissions;
        else if (user.PermissionGroupId.HasValue)
        {
            var group = await _db.PermissionGroups
                .FirstOrDefaultAsync(g => g.Id == user.PermissionGroupId.Value);
            permissions = group?.Permissions ?? DefaultPermissions.ForRole(role);
        }
        else
            permissions = DefaultPermissions.ForRole(role);

        return Ok(ApiResponse<AuthResponseDto>.Ok(new AuthResponseDto(
            AccessToken: accessToken,
            RefreshToken: string.Empty,
            UserId: user.Id,
            FullName: user.FullName,
            Email: user.Email!,
            Role: role,
            ExpiresAt: DateTime.UtcNow.AddHours(8),
            Permissions: permissions
        )));
    }
}
