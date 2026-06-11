using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;

namespace RwandaMotor.Application.Features.ServicePolicies.Queries;

public record GetServicePoliciesQuery(Guid? BrandId = null) : IRequest<List<ServicePolicyDto>>;

public class GetServicePoliciesQueryHandler : IRequestHandler<GetServicePoliciesQuery, List<ServicePolicyDto>>
{
    private readonly IApplicationDbContext _db;

    public GetServicePoliciesQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<List<ServicePolicyDto>> Handle(GetServicePoliciesQuery q, CancellationToken ct)
    {
        var query = _db.ServicePolicies
            .Include(p => p.Brand)
            .Include(p => p.Model)
            .Where(p => !p.IsDeleted && p.IsActive);

        if (q.BrandId.HasValue)
            query = query.Where(p => p.BrandId == q.BrandId || p.BrandId == null);

        return await query
            .OrderBy(p => p.Brand != null ? p.Brand.Name : "ZZZ")
            .ThenBy(p => p.Name)
            .Select(p => new ServicePolicyDto(
                p.Id,
                p.Name,
                p.Description,
                p.Brand != null ? p.Brand.Name : null,
                p.Model != null ? p.Model.Name : null,
                p.IntervalKm,
                p.IntervalMonths,
                p.DueSoonLeadDays,
                p.DueSoonLeadKm,
                p.LostThresholdMonths,
                p.IsDefault
            ))
            .ToListAsync(ct);
    }
}

public record ServicePolicyDto(
    Guid Id, string Name, string? Description,
    string? BrandName, string? ModelName,
    int IntervalKm, int IntervalMonths,
    int DueSoonLeadDays, int DueSoonLeadKm,
    int LostThresholdMonths, bool IsDefault);
