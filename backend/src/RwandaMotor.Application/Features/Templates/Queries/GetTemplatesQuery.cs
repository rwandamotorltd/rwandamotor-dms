using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;

namespace RwandaMotor.Application.Features.Templates.Queries;

public record TemplateDto(
    Guid   Id,
    string DocumentType,
    string Name,
    int    PageWidth,
    int    PageHeight,
    string FieldsJson,
    bool   IsDefault,
    DateTime UpdatedAt
);

public record GetTemplatesQuery(string? DocumentType = null) : IRequest<List<TemplateDto>>;

public class GetTemplatesQueryHandler : IRequestHandler<GetTemplatesQuery, List<TemplateDto>>
{
    private readonly IApplicationDbContext _db;
    public GetTemplatesQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<List<TemplateDto>> Handle(GetTemplatesQuery request, CancellationToken ct)
    {
        var q = _db.DocumentTemplates.Where(t => !t.IsDeleted);
        if (!string.IsNullOrEmpty(request.DocumentType))
            q = q.Where(t => t.DocumentType == request.DocumentType);

        return await q.OrderBy(t => t.DocumentType).ThenBy(t => t.CreatedAt)
            .Select(t => new TemplateDto(t.Id, t.DocumentType, t.Name, t.PageWidth, t.PageHeight, t.FieldsJson, t.IsDefault, t.UpdatedAt ?? t.CreatedAt))
            .ToListAsync(ct);
    }
}
