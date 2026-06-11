using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;

namespace RwandaMotor.Application.Features.Customers.Commands;

public record DeleteCustomersCommand(List<Guid> Ids) : IRequest<int>;

public class DeleteCustomersCommandHandler : IRequestHandler<DeleteCustomersCommand, int>
{
    private readonly IApplicationDbContext _db;

    public DeleteCustomersCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<int> Handle(DeleteCustomersCommand cmd, CancellationToken ct)
    {
        var customers = await _db.Customers
            .Where(c => cmd.Ids.Contains(c.Id) && !c.IsDeleted)
            .ToListAsync(ct);

        var now = DateTime.UtcNow;
        foreach (var c in customers)
        {
            c.IsDeleted  = true;
            c.DeletedAt  = now;
            c.DeletedBy  = "admin";
        }

        await _db.SaveChangesAsync(ct);
        return customers.Count;
    }
}
