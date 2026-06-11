using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.Customers.Commands;

/// <summary>
/// Deletes all customers that match the given filters (Admin only).
/// No IDs needed — the backend re-applies the same filters as the list query.
/// </summary>
public record DeleteAllCustomersCommand(
    string? Search,
    CustomerCategory? Category
) : IRequest<int>;

public class DeleteAllCustomersCommandHandler : IRequestHandler<DeleteAllCustomersCommand, int>
{
    private readonly IApplicationDbContext _db;

    public DeleteAllCustomersCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<int> Handle(DeleteAllCustomersCommand cmd, CancellationToken ct)
    {
        var query = _db.Customers.Where(c => !c.IsDeleted);

        if (!string.IsNullOrWhiteSpace(cmd.Search))
        {
            var s = cmd.Search.ToLower();
            query = query.Where(c =>
                c.FullName.ToLower().Contains(s) ||
                (c.Phone != null && c.Phone.Contains(s)) ||
                (c.Email != null && c.Email.ToLower().Contains(s)));
        }

        if (cmd.Category.HasValue)
            query = query.Where(c => c.Category == cmd.Category);

        var customers = await query.ToListAsync(ct);

        var now = DateTime.UtcNow;
        foreach (var c in customers)
        {
            c.IsDeleted = true;
            c.DeletedAt = now;
            c.DeletedBy = "admin";
        }

        await _db.SaveChangesAsync(ct);
        return customers.Count;
    }
}
