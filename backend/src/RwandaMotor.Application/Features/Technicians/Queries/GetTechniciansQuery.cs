using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;

namespace RwandaMotor.Application.Features.Technicians.Queries;

public record TechnicianDto(
    Guid Id,
    string FullName,
    string EmployeeCode,
    string? Specialization,
    string? Phone,
    string? Email,
    string? CertificationLevel,
    bool IsActive
);

public record GetTechniciansQuery(bool ActiveOnly = true) : IRequest<List<TechnicianDto>>;

public class GetTechniciansQueryHandler : IRequestHandler<GetTechniciansQuery, List<TechnicianDto>>
{
    private readonly IApplicationDbContext _db;

    public GetTechniciansQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<List<TechnicianDto>> Handle(GetTechniciansQuery request, CancellationToken ct)
    {
        var query = _db.Technicians.Where(t => !t.IsDeleted);
        if (request.ActiveOnly)
            query = query.Where(t => t.IsActive);

        return await query
            .OrderBy(t => t.FullName)
            .Select(t => new TechnicianDto(
                t.Id, t.FullName, t.EmployeeCode, t.Specialization,
                t.Phone, t.Email, t.CertificationLevel, t.IsActive))
            .ToListAsync(ct);
    }
}
