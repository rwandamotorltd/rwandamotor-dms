namespace RwandaMotor.Application.Common.Interfaces;

public interface IServiceIntervalEngine
{
    /// <summary>
    /// Resolves the applicable service policy for a vehicle (brand → model → vehicle override → default),
    /// then calculates the next service due date and mileage.
    /// </summary>
    Task<NextServiceResult> CalculateNextServiceAsync(
        Guid vehicleId,
        int currentMileage,
        DateTime serviceDate,
        CancellationToken ct = default);

    /// <summary>Determine vehicle retention status based on current date, policy, and service history.</summary>
    Task<ServiceDueStatus> DetermineServiceDueStatusAsync(Guid vehicleId, CancellationToken ct = default);
}

public record NextServiceResult(
    int NextServiceMileage,
    DateTime NextServiceDate,
    Guid PolicyId,
    string PolicyName,
    int IntervalKm,
    int IntervalMonths);

public enum ServiceDueStatus
{
    Active,
    DueSoon,
    Overdue,
    Lost
}
