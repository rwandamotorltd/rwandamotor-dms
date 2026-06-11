using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Domain.Events;

public record VehicleStatusChangedEvent(
    Guid VehicleId,
    RetentionStatus OldStatus,
    RetentionStatus NewStatus,
    DateTime ChangedAt);

public record ServiceRecordCreatedEvent(
    Guid ServiceRecordId,
    Guid VehicleId,
    DateTime ServiceDate,
    int MileageAtService);

public record LostVehicleDetectedEvent(
    Guid VehicleId,
    Guid? CustomerId,
    DateTime DetectedAt,
    int MonthsOverdue);
