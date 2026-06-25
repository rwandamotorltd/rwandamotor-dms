using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.JobCards.Commands;

public record DeleteAllJobCardsCommand(
    string? Search,
    JobCardStatus? Status,
    ServiceType? ServiceType
) : IRequest<int>;

public class DeleteAllJobCardsCommandHandler : IRequestHandler<DeleteAllJobCardsCommand, int>
{
    private readonly IApplicationDbContext _db;

    public DeleteAllJobCardsCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<int> Handle(DeleteAllJobCardsCommand cmd, CancellationToken ct)
    {
        var query = _db.JobCards.AsQueryable();

        if (cmd.Status.HasValue)
            query = query.Where(j => j.Status == cmd.Status.Value);

        if (cmd.ServiceType.HasValue)
            query = query.Where(j => j.ServiceType == cmd.ServiceType.Value);

        if (!string.IsNullOrWhiteSpace(cmd.Search))
        {
            var s = cmd.Search.Trim().ToLower();
            query = query.Where(j =>
                j.JobCardNumber.ToLower().Contains(s) ||
                j.Vehicle.VIN.ToLower().Contains(s) ||
                (j.Vehicle.PlateNumber != null && j.Vehicle.PlateNumber.ToLower().Contains(s)) ||
                (j.Customer != null && j.Customer.FullName.ToLower().Contains(s))
            );
        }

        var jobCards = await query.ToListAsync(ct);

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
