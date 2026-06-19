using Microsoft.AspNetCore.Identity;

namespace RwandaMotor.Domain.Entities;

public class ApplicationUser : IdentityUser
{
    public string FullName { get; set; } = string.Empty;
    public string? Role { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }

    /// <summary>Optional permission group — overrides role-based defaults when set.</summary>
    public Guid? PermissionGroupId { get; set; }

    /// <summary>Per-user permission keys. When non-empty, takes priority over PermissionGroupId and role defaults.</summary>
    public List<string> CustomPermissions { get; set; } = new();
}
