using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Entities;

namespace RwandaMotor.Application.Features.Admin.Queries;

public record UserDto(
    string Id,
    string FullName,
    string Email,
    string Role,
    bool IsActive,
    DateTime CreatedAt,
    Guid? PermissionGroupId,
    string? PermissionGroupName
);

public record GetUsersQuery : IRequest<List<UserDto>>;

public class GetUsersQueryHandler : IRequestHandler<GetUsersQuery, List<UserDto>>
{
    private readonly UserManager<ApplicationUser> _users;
    private readonly IApplicationDbContext _db;

    public GetUsersQueryHandler(UserManager<ApplicationUser> users, IApplicationDbContext db)
    {
        _users = users;
        _db = db;
    }

    public async Task<List<UserDto>> Handle(GetUsersQuery request, CancellationToken ct)
    {
        var users = _users.Users.OrderBy(u => u.FullName).ToList();

        // Load all permission groups for lookup
        var groups = await _db.PermissionGroups
            .ToDictionaryAsync(g => g.Id, g => g.Name, ct);

        var result = new List<UserDto>();
        foreach (var u in users)
        {
            var roles = a