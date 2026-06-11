using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Common.Interfaces;

public interface IRetentionEngine
{
    /// <summary>Recalculate and persist retention status for a single vehicle.</summary>
    Task<RetentionStatus> EvaluateVehicleStatusAsync(Guid vehicleId, CancellationToken ct = default);

    /// <summary>Batch evaluate all active vehicles — run nightly by background job.</summary>
    Task EvaluateAllVehiclesAsync(CancellationToken ct = default);

    Task<RetentionSummaryDto> GetRetentionSummaryAsync(RetentionPeriod period, DateTime? asOf = null, CancellationToken ct = default);
    Task<List<RetentionTrendPointDto>> GetRetentionTrendAsync(int months, CancellationToken ct = default);
    Task<List<BrandRetentionDto>> GetRetentionByBrandAsync(DateTime from, DateTime to, CancellationToken ct = default);
    Task<List<CohortRetentionDto>> GetCohortRetentionAsync(int cohortYear, CancellationToken ct = default);
}

public enum RetentionPeriod { Monthly, Quarterly, SixMonth, Yearly }

public record RetentionSummaryDto(
    decimal RetentionRate,
    int EligibleVehicles,
    int ReturnedVehicles,
    int LostVehicles,
    int DueSoonVehicles,
    int OverdueVehicles,
    int RecoveredVehicles,
    DateTime CalculatedAt);

public record RetentionTrendPointDto(
    string Label,
    decimal RetentionRate,
    int Returned,
    int Eligible,
    int Lost);

public record BrandRetentionDto(
    string BrandName,
    string BrandCode,
    decimal RetentionRate,
    int Eligible,
    int Returned,
    int Lost);

public record CohortRetentionDto(
    string CohortLabel,
    int TotalVehicles,
    decimal Month3Rate,
    decimal Month6Rate,
    decimal Month12Rate,
    decimal Month24Rate);
