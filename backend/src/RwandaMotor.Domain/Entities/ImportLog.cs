using RwandaMotor.Domain.Common;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Domain.Entities;

public class ImportLog : BaseEntity
{
    public ImportType ImportType { get; set; }
    public ImportStatus Status { get; set; } = ImportStatus.Pending;

    public string FileName { get; set; } = string.Empty;
    public string? OriginalFileName { get; set; }
    public long FileSizeBytes { get; set; }

    public int TotalRows { get; set; }
    public int ValidRows { get; set; }
    public int ImportedRows { get; set; }
    public int ErrorRows { get; set; }
    public int DuplicateRows { get; set; }

    public string? ErrorSummary { get; set; }
    public string? ErrorDetailsJson { get; set; }

    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public bool IsRolledBack { get; set; } = false;
    public DateTime? RolledBackAt { get; set; }

    public ICollection<ImportLogRow> Rows { get; set; } = new List<ImportLogRow>();
}

public class ImportLogRow : BaseEntity
{
    public Guid ImportLogId { get; set; }
    public int RowNumber { get; set; }
    public bool IsValid { get; set; }
    public bool IsDuplicate { get; set; }
    public bool IsImported { get; set; }
    public string? RawDataJson { get; set; }
    public string? ErrorMessage { get; set; }

    public ImportLog ImportLog { get; set; } = null!;
}
