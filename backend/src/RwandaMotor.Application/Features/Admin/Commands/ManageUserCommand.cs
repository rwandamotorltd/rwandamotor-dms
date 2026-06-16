using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Entities;
using FluentValidation;

namespace RwandaMotor.Application.Features.Admin.Commands;

// -- Create User ---------------------------------------------------------------

public record CreateUserCommand(
    string FullName,
    string Email,
    string Password,
    string Role,
    Guid? PermissionGroupId = null,
    List<string>? CustomPermissions = null
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
            UserName          = cmd.Email,
            Email             = cmd.Email,
            FullName          = cmd.FullName.Trim(),
            IsActive          = true,
            PermissionGroupId = cmd.PermissionGroupId,
            CustomPermissions = cmd.CustomPermissions ?? new(),
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

// -- Update User ---------------------------------------------------------------

public record UpdateUserCommand(
    string UserId,
    string FullName,
    string Role,
    bool IsActive,
    Guid? PermissionGroupId = null,
    List<string>? CustomPermissions = null
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

        user.FullName          = cmd.FullName.Trim();
        user.IsActive          = cmd.IsActive;
        user.PermissionGroupId = cmd.PermissionGroupId;
        user.CustomPermissions = cmd.CustomPermissions ?? new();
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

// -- Reset Password ------------------------------------------------------------

public record ResetPasswordCommand(
    string UserId,
    string NewPassword
) : IRequest<(bool Success, string? Error)>;

public class ResetPasswordCommandValidator : AbstractValidator<ResetPasswordCommand>
{
    public ResetPasswordCommandValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
        RuleFor(x => x.NewPassword).NotEmpty().MinimumLength(8);
    }
}

public class ResetPasswordCommandHandler : IRequestHandler<ResetPasswordCommand, (bool Success, string? Error)>
{
    private readonly UserManager<ApplicationUser> _users;

    public ResetPasswordCommandHandler(UserManager<ApplicationUser> users) => _users = users;

    public async Task<(bool Success, string? Error)> Handle(ResetPasswordCommand cmd, CancellationToken ct)
    {
        var user = await _users.FindByIdAsync(cmd.UserId);
        if (user == null) return (false, "User not found.");

        var token = await _users.GeneratePasswordResetTokenAsync(user);
        var result = await _users.ResetPasswordAsync(user, token, cmd.NewPassword);

        if (!result.Succeeded)
            return (false, string.Join("; ", result.Errors.Select(e => e.Description)));

        return (true, null);
    }
}

// -- Delete User ---------------------------------------------------------------

public record DeleteUserCommand(string UserId) : IRequest<(bool Success, string? Error)>;

public class DeleteUserCommandHandler : IRequestHandler<DeleteUserCommand, (bool Success, string? Error)>
{
    private readonly UserManager<ApplicationUser> _users;

    public DeleteUserCommandHandler(UserManager<ApplicationUser> users) => _users = users;

    public async Task<(bool Success, string? Error)> Handle(DeleteUserCommand cmd, CancellationToken ct)
    {
        var user = await _users.FindByIdAsync(cmd.UserId);
        if (user == null) return (false, "User not found.");

        user.IsActive = false;
        var result = await _users.UpdateAsync(user);
        if (!result.Succeeded)
            return (false, string.Join("; ", result.Errors.Select(e => e.Description)));

        return (true, null);
    }
}
