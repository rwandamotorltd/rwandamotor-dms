using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RwandaMotor.Application.Common.Interfaces;

namespace RwandaMotor.Infrastructure.Services;

public class SmtpSettings
{
    public string Host { get; set; } = "";
    public int Port { get; set; } = 587;
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public bool EnableSsl { get; set; } = true;
    public string FromAddress { get; set; } = "noreply@rwandamotor.com";
    public string FromName { get; set; } = "Rwanda Motor DMS";
    public string AlertRecipient { get; set; } = "";
}

public class SmtpEmailService : IEmailService
{
    private readonly SmtpSettings _settings;
    private readonly ILogger<SmtpEmailService> _log;

    public SmtpEmailService(IOptions<SmtpSettings> settings, ILogger<SmtpEmailService> log)
    {
        _settings = settings.Value;
        _log = log;
    }

    public async Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_settings.Host))
        {
            _log.LogWarning("Email not configured — skipping send to {To}: {Subject}", to, subject);
            return;
        }

        using var client = new SmtpClient(_settings.Host, _settings.Port)
        {
            Credentials = new NetworkCredential(_settings.Username, _settings.Password),
            EnableSsl = _settings.EnableSsl,
        };

        using var message = new MailMessage
        {
            From = new MailAddress(_settings.FromAddress, _settings.FromName),
            Subject = subject,
            Body = htmlBody,
            IsBodyHtml = true,
        };
        message.To.Add(to);

        await client.SendMailAsync(message, ct);
        _log.LogInformation("Email sent to {To}: {Subject}", to, subject);
    }
}
