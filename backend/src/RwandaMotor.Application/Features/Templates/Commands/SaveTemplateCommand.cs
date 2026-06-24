using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Application.Features.Templates.Queries;
using RwandaMotor.Domain.Entities;

namespace RwandaMotor.Application.Features.Templates.Commands;

public record SaveTemplateCommand(
    Guid?  Id,
    string DocumentType,
    string Name,
    int    PageWidth,
    int    PageHeight,
    string FieldsJson,
    bool   IsDefault
) : IRequest<TemplateDto>;

public class SaveTemplateCommandHandler : IRequestHandler<SaveTemplateCommand, TemplateDto>
{
    private readonly IApplicationDbContext _db;
    public SaveTemplateCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<TemplateDto> Handle(SaveTemplateCommand request, CancellationToken ct)
    {
        DocumentTemplate template;

        if (request.Id.HasValue)
        {
            template = await _db.DocumentTemplates.FirstOrDefaultAsync(t => t.Id == request.Id.Value && !t.IsDeleted, ct)
                       ?? throw new KeyNotFoundException("Template not found");
        }
        else
        {
            template = new DocumentTemplate();
            _db.DocumentTemplates.Add(template);
        }

        template.DocumentType = request.DocumentType;
        template.Name         = request.Name;
        template.PageWidth    = request.PageWidth;
        template.PageHeight   = request.PageHeight;
        template.FieldsJson   = request.FieldsJson;
        template.IsDefault    = request.IsDefault;
        template.UpdatedAt    = DateTime.UtcNow;

        // If marking as default, clear default on others of same type
        if (request.IsDefault)
        {
            var others = await _db.DocumentTemplates
                .Where(t => t.DocumentType == request.DocumentType && t.Id != template.Id && !t.IsDeleted)
                .ToListAsync(ct);
            foreach (var o in others) o.IsDefault = false;
        }

        await _db.SaveChangesAsync(ct);
        return new TemplateDto(template.Id, template.DocumentType, template.Name, template.PageWidth, template.PageHeight, template.FieldsJson, template.IsDefault, template.UpdatedAt!.Value);
    }
}
