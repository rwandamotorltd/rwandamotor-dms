using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Application.Common.Permissions;
using RwandaMotor.Domain.Entities;

namespace RwandaMotor.Application.Features.Auth.Commands;

public record LoginCommand(string Email, string Password) : IRequest<AuthResponseDto>;

public class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty();
    }
}

public class LoginCommandHandler : IRequestHandler<LoginCommand, AuthResponseDto>
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IJwtService _jwtService;
    private readonly IApplicationDbContext _db;

    public LoginCommandHandler(UserManager<ApplicationUser> userManager, IJwtService jwtService, IApplicationDbContext db)
    {
        _userManager = userManager;
        _jwtService = jwtService;
        _db = db;
    }

    public async Task<AuthResponseDto> Handle(LoginCommand cmd, CancellationToken ct)
    {
        var user = await _userManager.FindByEmailAsync(cmd.Email)
            ?? throw new UnauthorizedAccessException("Invalid credentials.");

        if (!user.IsActive)
            throw new UnauthorizedAccessException("Account is disabled.");

        var validPassword = await _userManager.CheckPasswordAsync(user, cmd.Password);
        if (!validPassword)
            throw new UnauthorizedAccessException("Invalid credentials.");

        var roles = await _userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? string.Empty;

        var accessToken = _jwtService.GenerateAccessToken(user, roles);
        var refreshToken = _jwtService.GenerateRefreshToken();

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        user.LastLoginAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        // Resolve effective permissions: custom > group > role defaults
        List<string> permissions;
        if (user.CustomPermissions.Count > 0)
        {
            permissions = user.CustomPermissions;
        }
        else if (user.PermissionGroupId.HasValue)
        {
            var group = await _db.PermissionGroups
                .FirstOrDefaultAsync(g => g.Id == user.PermissionGroupId.Value, ct);
            permissions = group?.Permissions ?? DefaultPermissions.ForRole(role);
        }
        else
        {
            permissions = DefaultPermissions.ForRole(role);
        }

        return new AuthResponseDto(
            AccessToken: accessToken,
            RefreshToken: refreshToken,
            UserId: user.Id,
            FullName: user.FullName,
            Email: user.Email!,
            Role: role,
            ExpiresAt: DateTime.UtcNow.AddHours(8),
            Permissions: permissions
        );
    }
}

public record AuthResponseDto(
    string AccessToken,
    string RefreshToken,
    string UserId,
    string FullName,
    string Email,
    string Role,
    DateTime ExpiresAt,
    List<string> Permissions);
