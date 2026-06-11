namespace RwandaMotor.Domain.Enums;

public enum RetentionStatus
{
    Active = 1,
    DueSoon = 2,
    Overdue = 3,
    Lost = 4,
    Recovered = 5,
    External = 6   // vehicle not sold by dealership
}
