using MediatR;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.Import.Commands;

public record ProcessImportCommand(
    Guid ImportLogId,
    bool CommitIfValid = true
) : IRequest<ProcessImportResultDto>;

public record ProcessImportResultDto(
    Guid ImportLogId,
    ImportStatus FinalStatus,
    int TotalRows,
    int ImportedRows,
    int ErrorRows,
    int DuplicateRows,
    List<ImportRowErrorDto> Errors
);

public record ImportRowErrorDto(int RowNumber, string Field, string Error);

public record ValidateImportFileCommand(
    string FileName,
    string FileContentBase64,
    ImportType ImportType
) : IRequest<ValidateImportResultDto>;

public record ValidateImportResultDto(
    Guid ImportLogId,
    int TotalRows,
    int ValidRows,
    int ErrorRows,
    int DuplicateRows,
    List<ImportRowPreviewDto> Preview,
    List<ImportRowErrorDto> Errors
);

public record ImportRowPreviewDto(
    int RowNumber,
    bool IsValid,
    bool IsDuplicate,
    Dictionary<string, string> Data,
    string? Error
);
