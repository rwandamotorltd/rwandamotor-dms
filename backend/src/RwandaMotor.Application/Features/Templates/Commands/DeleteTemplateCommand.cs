using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;

namespace RwandaMotor.Application.Features.Templates.Commands;

public record DeleteTemplateCommand(Guid Id) : IRequest<bool>;

public class DeleteTemplateCommandHandler : IRequestHandler<DeleteTemplateCommand, bool>
{
    private readonly IApplicationDbContext _db;
    public DeleteTemplateCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<bool> Handle(DeleteTemplateCommand request, CancellationToken ct)
    {
        var t = await _db.DocumentTemplates.FirstOrDefaultAsync(t => t.Id == request.Id && !t.IsDeleted, ct);
        if (t is null) return false;
        t.IsDeleted = true;
        t.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return true;
    }
}
