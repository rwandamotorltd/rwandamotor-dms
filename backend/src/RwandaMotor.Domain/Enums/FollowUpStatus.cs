namespace RwandaMotor.Domain.Enums;

public enum FollowUpStatus
{
    Pending = 1,
    InProgress = 2,
    CallbackScheduled = 3,
    AppointmentBooked = 4,
    Unreachable = 5,
    Declined = 6,
    Recovered = 7,
    Closed = 8
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

public enum InteractionOutcome
{
    Reached = 1,
    NoAnswer = 2,
    LeftMessage = 3,
    CallbackScheduled = 4,
    ServiceReminderEmailSent = 5,
    SatisfactionEmailSent = 6,
    AppointmentBooked = 7
}

public enum AppointmentStatus
{
    Scheduled = 1,
    Confirmed = 2,
    Completed = 3,
    Cancelled = 4,
    NoShow = 5
}

public enum NotificationType
{
    WelcomeCall = 1,
    ServiceDueSoon = 2,
    ServiceDue15Days = 3,
    CustomerLost = 4,
    FollowUpDue = 5,
    AppointmentReminder = 6,
    AppointmentConfirmed = 7
}
