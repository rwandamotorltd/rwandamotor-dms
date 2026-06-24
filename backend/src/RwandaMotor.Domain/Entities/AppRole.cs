namespace RwandaMotor.Domain.Entities;

public class AppRole
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Internal key used as ApplicationUser.Role value. Immutable after creation for built-in roles.</summary>
    public string Name { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>Built-in roles (Admin, CRMOfficer, etc.) cannot be deleted and their Name cannot change.</summary>
    public bool IsBuiltIn { get; set; }
}
