using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Entities;

namespace RwandaMotor.Application.Features.PermissionGroups;

// ── DTOs ─────────────────────────────────────────────────────────────────────

public record PermissionGroupDto(
    Guid Id,
    string Name,
    string? Description,
    List<string> Permissions,
    DateTime CreatedAt
);

// ── List ─────────────────────────────────────────────────────────────────────

public record GetPermissionGroupsQuery : IRequest<List<PermissionGroupDto>>;

public class GetPermissionGroupsQueryHandler : IRequestHandler<GetPermissionGroupsQuery, List<PermissionGroupDto>>
{
    private readonly IApplicationDbContext _db;
    public GetPermissionGroupsQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<List<PermissionGroupDto>> Handle(GetPermissionGroupsQuery _, CancellationToken ct)
    {
        return await _db.PermissionGroups
            .OrderBy(g => g.Name)
            .Select(g => new PermissionGroupDto(g.Id, g.Name, g.Description, g.Permissions, g.CreatedAt))
            .ToListAsync(ct);
    }
}

// ── Create ────────────────────────────────────────────────────────────────────

public record CreatePermissionGroupCommand(
    string Name,
    string? Description,
    List<string> Permissions
) : IRequest<Guid>;

public class CreatePermissionGroupCommandValidator : AbstractValidator<CreatePermissionGroupCommand>
{
    public CreatePermissionGroupCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
    }
}

public class CreatePermissionGroupCommandHandler : IRequestHandler<CreatePermissionGroupCommand, Guid>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;
    public CreatePermissionGroupCommandHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    { _db = db; _currentUser = currentUser; }

    public async Task<Guid> Handle(CreatePermissionGroupCommand cmd, CancellationToken ct)
    {
        var group = new PermissionGroup
        {
            Name = cmd.Name.Trim(),
            Description = cmd.Description?.Trim(),
            Permissions = cmd.Permissions ?? new(),
            CreatedBy = _currentUser.UserId,
        };
        _db.PermissionGroups.Add(group);
        await _db.SaveChangesAsync(ct);
        return group.Id;
    }
}

// ── Update ────────────────────────────────────────────────────────────────────

public record UpdatePermissionGroupCommand(
    Guid Id,
    string Name,
    string? Description,
    List<string> Permissions
) : IRequest<bool>;

public class UpdatePermissionGroupCommandHandler : IRequestHandler<UpdatePermissionGroupCommand, bool>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;
    public UpdatePermissionGroupCommandHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    { _db = db; _currentUser = currentUser; }

    public async Task<bool> Handle(UpdatePermissionGroupCommand cmd, CancellationToken ct)
    {
        var group = await _db.PermissionGroups.FirstOrDefaultAsync(g => g.Id == cmd.Id, ct);
        if (group == null) return false;

        group.Name = cmd.Name.Trim();
        group.Description = cmd.Description?.Trim();
        group.Permissions = cmd.Permissions ?? new();
        group.UpdatedBy = _currentUser.UserId;
        group.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return true;
    }
}

// ── Delete ────────────────────────────────────────────────────────────────────

public record DeletePermissionGroupCommand(Guid Id) : IRequest<bool>;

public class DeletePermissionGroupCommandHandler : IRequestHandler<DeletePermissionGroupCommand, bool>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;
    public DeletePermissionGroupCommandHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    { _db = db; _currentUser = currentUser; }

    public async Task<bool> Handle(DeletePermissionGroupCommand cmd, CancellationToken ct)
    {
        var group = await _db.PermissionGroups.FirstOrDefaultAsync(g => g.Id == cmd.Id, ct);
        if (group == null) return false;

        group.IsDeleted = true;
        group.DeletedAt = DateTime.UtcNow;
        group.DeletedBy = _currentUser.UserId;
        await _db.SaveChangesAsync(ct);
        return true;
    }
}
