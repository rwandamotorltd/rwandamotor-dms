using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;

namespace RwandaMotor.Application.Features.JobCards.Commands;

public record BulkDeleteJobCardsCommand(List<Guid> Ids) : IRequest<int>;

public class BulkDeleteJobCardsCommandHandler : IRequestHandler<BulkDeleteJobCardsCommand, int>
{
    private readonly IApplicationDbContext _db;

    public BulkDeleteJobCardsCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<int> Handle(BulkDeleteJobCardsCommand cmd, CancellationToken ct)
    {
        var jobCards = await _db.JobCards
            .Where(j => cmd.Ids.Contains(j.Id) && !j.IsDeleted)
            .ToListAsync(ct);

        var now = DateTime.UtcNow;
        foreach (var j in jobCards)
        {
            j.IsDeleted = true;
            j.DeletedAt = now;
            j.DeletedBy = "admin";
        }

        await _db.SaveChangesAsync(ct);
        return jobCards.Count;
    }
}
