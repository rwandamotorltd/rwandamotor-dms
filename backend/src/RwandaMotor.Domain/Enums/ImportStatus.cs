namespace RwandaMotor.Domain.Enums;

public enum ImportStatus
{
    Pending = 1,
    Validating = 2,
    Valid = 3,
    Invalid = 4,
    Importing = 5,
    Completed = 6,
    CompletedWithErrors = 7,
    RolledBack = 8,
    Failed = 9
}

public enum ImportType
{
    Vehicles = 1,
    Customers = 2,
    ServiceRecords = 3,
    JobCards = 4
}
