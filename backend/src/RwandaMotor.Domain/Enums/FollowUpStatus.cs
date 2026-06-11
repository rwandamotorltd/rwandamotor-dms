namespace RwandaMotor.Domain.Enums;

public enum FollowUpStatus
{
    Pending = 1,
    Contacted = 2,
    AppointmentBooked = 3,
    Recovered = 4,
    Unreachable = 5,
    Declined = 6,
    Closed = 7
}

public enum FollowUpPriority
{
    Low = 1,
    Medium = 2,
    High = 3,
    Critical = 4
}

public enum ContactMethod
{
    Phone = 1,
    SMS = 2,
    Email = 3,
    WhatsApp = 4,
    InPerson = 5
}
