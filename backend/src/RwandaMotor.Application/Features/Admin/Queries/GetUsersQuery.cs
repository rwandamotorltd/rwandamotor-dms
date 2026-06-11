using MediatR;
using Microsoft.AspNetCore.Identity;
using RwandaMotor.Domain.Entities;

namespace RwandaMotor.Application.Features.Admin.Queries;

public record UserDto(
    string Id,
    string FullName,
    string Email,
    string Role,
    bool IsActive,
    DateTime CreatedAt
);

public record GetUsersQuery : IRequest<List<UserDto>>;

public class GetUsersQueryHandler : IRequestHandler<GetUsersQuery, List<UserDto>>
{
    private readonly UserManager<ApplicationUser> _users;

    public GetUsersQueryHandler(UserManager<ApplicationUser> users) => _users = users;

    public async Task<List<UserDto>> Handle(GetUsersQuery request, CancellationToken ct)
    {
        var users = _users.Users.OrderBy(u => u.FullName).ToList();

        var result = new List<UserDto>();
        foreach (var u in users)
        {
            var roles = await _users.GetRolesAsync(u);
            result.Add(new UserDto(
                u.Id ?? "",
                u.FullName,
                u.Email ?? "",
                roles.FirstOrDefault() ?? "—",
                u.IsActive,
                u.Id != null ? DateTime.UtcNow : DateTime.UtcNow // placeholder — Identity doesn't store CreatedAt by default
            ));
        }
        return result;
    }
}
