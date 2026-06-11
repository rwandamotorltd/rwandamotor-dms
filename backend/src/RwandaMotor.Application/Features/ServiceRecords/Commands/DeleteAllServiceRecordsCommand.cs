using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.ServiceRecords.Commands;

/// <summary>
/// Deletes all service records that match the given filters (Admin only).
/// Mirrors the filter logic of GetServiceRecordsQuery.
/// </summary>
public record DeleteAllServiceRecordsCommand(
    string? Search,
    ServiceType? ServiceType,
    DateTime? DateFrom,
    DateTime? DateTo
) : IRequest<int>;

public class DeleteAllServiceRecordsCommandHandler : IRequestHandler<DeleteAllServiceRecordsCommand, int>
{
    private readonly IApplicationDbContext _db;

    public DeleteAllServiceRecordsCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<int> Handle(DeleteAllServiceRecordsCommand cmd, CancellationToken ct)
    {
        var query = _db.ServiceRecords.Where(sr => !sr.IsDeleted);

        if (!string.IsNullOrWhiteSpace(cmd.Search))
        {
            var s = cmd.Search.ToLower();
            query = query.Where(sr =>
                sr.Vehicle.VIN.ToLower().Contains(s) ||
                (sr.Vehicle.PlateNumber != null && sr.Vehicle.PlateNumber.ToLower().Contains(s)) ||
                (sr.InvoiceNumber != null && sr.InvoiceNumber.ToLower().Contains(s)));
        }

        if (cmd.ServiceType.HasValue)
            query = query.Where(sr => sr.ServiceType == cmd.ServiceType);

        if (cmd.DateFrom.HasValue)
            query = query.Where(sr => sr.ServiceDate >= cmd.DateFrom.Value);

        if (cmd.DateTo.HasValue)
            query = query.Where(sr => sr.ServiceDate <= cmd.DateTo.Value);

        var records = await query.ToListAsync(ct);

        var now = DateTime.UtcNow;
        foreach (var sr in records)
        {
            sr.IsDeleted = true;
            sr.DeletedAt = now;
            sr.DeletedBy = "admin";
        }

        await _db.SaveChangesAsync(ct);
        return records.Count;
    }
}
