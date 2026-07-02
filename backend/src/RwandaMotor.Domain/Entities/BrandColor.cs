namespace RwandaMotor.Domain.Entities;

public class BrandColor
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string HexValue { get; set; } = "#3b82f6";
    public int SortOrder { get; set; }
}
