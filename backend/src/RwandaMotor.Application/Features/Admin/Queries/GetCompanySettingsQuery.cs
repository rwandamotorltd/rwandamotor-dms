using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Entities;

namespace RwandaMotor.Application.Features.Admin.Queries;

public record GetCompanySettingsQuery : IRequest<CompanySettingsDto>;

public record CompanySettingsDto(
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
    string? FooterDisclaimer
);

public class GetCompanySettingsQueryHandler : IRequestHandler<GetCompanySettingsQuery, CompanySettingsDto>
{
    private readonly IApplicationDbContext _db;

    public GetCompanySettingsQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<CompanySettingsDto> Handle(GetCompanySettingsQuery request, CancellationToken ct)
    {
        var settings = await _db.CompanySettings
            .FirstOrDefaultAsync(s => s.Id == CompanySettings.SingletonId, ct)
            ?? new CompanySettings(); // return defaults if row not yet seeded

        return new CompanySettingsDto(
            settings.CompanyName,
            settings.Address,
            settings.Phone,
            settings.Email,
            settings.TinNumber,
            settings.Website,
            settings.JobCardShowHeader,
            settings.JobCardShowFooter,
            settings.DeliveryNoteShowHeader,
            settings.DeliveryNoteShowFooter,
            settings.FooterDisclaimer
        );
    }
}
