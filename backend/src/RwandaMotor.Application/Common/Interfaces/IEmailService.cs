namespace RwandaMotor.Application.Common.Interfaces;

public interface IEmailService
{
    /// <summary>Send an HTML email. Silently skips if email is not configured.</summary>
    Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct = default);
}
