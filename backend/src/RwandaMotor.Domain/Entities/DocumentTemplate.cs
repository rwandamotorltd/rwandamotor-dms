using RwandaMotor.Domain.Common;

namespace RwandaMotor.Domain.Entities;

public class DocumentTemplate : BaseEntity
{
    public string DocumentType { get; set; } = string.Empty; // e.g. "jobCard", "deliveryNote"
    public string Name         { get; set; } = string.Empty;
    public int    PageWidth    { get; set; } = 794;          // A4 portrait at 96 dpi
    public int    PageHeight   { get; set; } = 1123;
    public string FieldsJson   { get; set; } = "[]";         // JSON array of TemplateField
    public bool   IsDefault    { get; set; } = false;
}
