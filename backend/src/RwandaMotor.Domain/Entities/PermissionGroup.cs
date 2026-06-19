using RwandaMotor.Domain.Common;

namespace RwandaMotor.Domain.Entities;

public class PermissionGroup : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>Flat list of permission keys, stored as jsonb. E.g. ["nav.dashboard","jobCards.create"]</summary>
    public List<string> Permissions { get; set; } = new();
}
