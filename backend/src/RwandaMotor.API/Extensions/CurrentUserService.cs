using System.Security.Claims;
using RwandaMotor.Application.Common.Interfaces;

namespace RwandaMotor.API.Extensions;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
        => _httpContextAccessor = httpContextAccessor;

    public string? UserId => _httpContextAccessor.HttpContext?.User?.FindFirstValue("userId");
    public string? UserName
    {
        get
        {
            var val = _httpContextAccessor.HttpContext?.User?.FindFirstValue("fullName");
            return string.IsNullOrEmpty(val) ? null : val;
        }
    }
    public string? Email => _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.Email);
    public string? Role => _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.Role);
    public bool IsAuthenticated => _httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated ?? false;
}
