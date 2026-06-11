using MediatR;
using Microsoft.AspNetCore.Identity;
using RwandaMotor.Domain.Entities;

namespace RwandaMotor.Application.Features.Admin.Commands;

// ── Create User ──────────────────────────────────────────────────────────────

public record CreateUserCommand(
    string FullName,
    string Email,
    string Password,
    string Role
) : IRequest<(bool Success, string? Error)>;

public class CreateUserCommandHandler : IRequestHandler<CreateUserCommand, (bool Success, string? Error)>
{
    private readonly UserManager<ApplicationUser> _users;
    private readonly RoleManager<IdentityRole> _roles;

    public CreateUserCommandHandler(UserManager<ApplicationUser> users, RoleManager<IdentityRole> roles)
    {
        _users = users;
        _roles = roles;
    }

    public async Task<(bool Success, string? Error)> Handle(CreateUserCommand cmd, CancellationToken ct)
    {
        if (await _users.FindByEmailAsync(cmd.Email) != null)
            return (false, "A user with this email already exists.");

        var user = new ApplicationUser
        {
            UserName = cmd.Email,
            Email    = cmd.Email,
            FullName = cmd.FullName.Trim(),
            IsActive = true,
        };

        var result = await _users.CreateAsync(user, cmd.Password);
        if (!result.Succeeded)
            return (false, string.Join("; ", result.Errors.Select(e => e.Description)));

        if (!await _roles.RoleExistsAsync(cmd.Role))
            return (false, $"Role '{cmd.Role}' does not exist.");

        await _users.AddToRoleAsync(user, cmd.Role);
        return (true, null);
    }
}

// ── Update User (role + active status) ──────────────────────────────────────

public record UpdateUserCommand(
    string UserId,
    string FullName,
    string Role,
    bool IsActive
) : IRequest<(bool Success, string? Error)>;

public class UpdateUserCommandHandler : IRequestHandler<UpdateUserCommand, (bool Success, string? Error)>
{
    private readonly UserManager<ApplicationUser> _users;
    private readonly RoleManager<IdentityRole> _roles;

    public UpdateUserCommandHandler(UserManager<ApplicationUser> users, RoleManager<IdentityRole> roles)
    {
        _users = users;
        _roles = roles;
    }

    public async Task<(bool Success, string? Error)> Handle(UpdateUserCommand cmd, CancellationToken ct)
    {
        var user = await _users.FindByIdAsync(cmd.UserId);
        if (user == null) return (false, "User not found.");

        user.FullName = cmd.FullName.Trim();
        user.IsActive = cmd.IsActive;
        await _users.UpdateAsync(user);

        // Replace role
        var existingRoles = await _users.GetRolesAsync(user);
        await _users.RemoveFromRolesAsync(user, existingRoles);

        if (!await _roles.RoleExistsAsync(cmd.Role))
            return (false, $"Role '{cmd.Role}' does not exist.");

        await _users.AddToRoleAsync(user, cmd.Role);
        return (true, null);
    }
}
