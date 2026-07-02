using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Entities;

namespace RwandaMotor.Application.Features.Admin.Commands;

public record UpdateCompanySettingsCommand(
    string CompanyName,
    string? Address,
    string? Phone,
    string? Email,
    string? TinNumber,
    string? Website,
    bool JobCardShowHeader,
    bool JobCardShowFooter,
    bool DeliveryNoteShowHeader,
    bool DeliveryNoteShowFooter,
    string? FooterDisclaimer,
    string? EmailJobCardMessage,
    string? EmailDeliveryNoteMessage,
    string? ServiceTypesConfig,
    string PwaOrientation = "portrait",
    string PrimaryColor = "#3b82f6"
) : IRequest<bool>;

public class UpdateCompanySettingsCommandHandler : IRequestHandler<UpdateCompanySettingsCommand, bool>
{
    private readonly IApplicationDbContext _db;

    public UpdateCompanySettingsCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<bool> Handle(UpdateCompanySettingsCommand request, CancellationToken ct)
    {
        var settings = await _db.CompanySettings
            .FirstOrDefaultAsync(s => s.Id == CompanySettings.SingletonId, ct);

        if (settings is null)
        {
            settings = new CompanySettings { Id = CompanySettings.SingletonId };
            _db.CompanySettings.Add(settings);
        }

        settings.CompanyName              = request.CompanyName;
        settings.Address                  = request.Address;
        settings.Phone                    = request.Phone;
        settings.Email                    = request.Email;
        settings.TinNumber                = request.TinNumber;
        settings.Website                  = request.Website;
        settings.JobCardShowHeader        = request.JobCardShowHeader;
        settings.JobCardShowFooter        = request.JobCardShowFooter;
        settings.DeliveryNoteShowHeader   = request.DeliveryNoteShowHeader;
        settings.DeliveryNoteShowFooter   = request.DeliveryNoteShowFooter;
        settings.FooterDisclaimer          = request.FooterDisclaimer;
        settings.EmailJobCardMessage       = request.EmailJobCardMessage;
        settings.EmailDeliveryNoteMessage  = request.EmailDeliveryNoteMessage;
        settings.ServiceTypesConfig        = request.ServiceTypesConfig;
        settings.PwaOrientation            = request.PwaOrientation;
        settings.PrimaryColor              = request.PrimaryColor;
        settings.UpdatedAt                 = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return true;
    }
}
