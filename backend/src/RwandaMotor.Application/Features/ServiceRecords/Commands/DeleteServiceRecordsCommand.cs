using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;

namespace RwandaMotor.Application.Features.ServiceRecords.Commands;

public record DeleteServiceRecordsCommand(List<Guid> Ids) : IRequest<int>;

public class DeleteServiceRecordsCommandHandler : IRequestHandler<DeleteServiceRecordsCommand, int>
{
    private readonly IApplicationDbContext _db;

    public DeleteServiceRecordsCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<int> Handle(DeleteServiceRecordsCommand cmd, CancellationToken ct)
    {
        var records = await _db.ServiceRecords
            .Where(sr => cmd.Ids.Contains(sr.Id) && !sr.IsDeleted)
            .ToListAsync(ct);

        var now = DateTime.UtcNow;
        foreach (var sr in records)
        {
            sr.IsDeleted  = true;
            sr.DeletedAt  = now;
            sr.DeletedBy  = "admin";
        }

        await _db.SaveChangesAsync(ct);
        return records.Count;
    }
}
