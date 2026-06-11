using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Entities;

namespace RwandaMotor.Application.Features.Technicians.Commands;

// ── Create ──────────────────────────────────────────────────────────────────

public record CreateTechnicianCommand(
    string FullName,
    string EmployeeCode,
    string? Phone,
    string? Email,
    string? Specialization,
    string? CertificationLevel
) : IRequest<Guid>;

public class CreateTechnicianCommandValidator : AbstractValidator<CreateTechnicianCommand>
{
    public CreateTechnicianCommandValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.EmployeeCode).NotEmpty().MaximumLength(50);
    }
}

public class CreateTechnicianCommandHandler : IRequestHandler<CreateTechnicianCommand, Guid>
{
    private readonly IApplicationDbContext _db;

    public CreateTechnicianCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<Guid> Handle(CreateTechnicianCommand cmd, CancellationToken ct)
    {
        var technician = new Technician
        {
            FullName           = cmd.FullName.Trim(),
            EmployeeCode       = cmd.EmployeeCode.Trim().ToUpperInvariant(),
            Phone              = cmd.Phone?.Trim(),
            Email              = cmd.Email?.Trim(),
            Specialization     = cmd.Specialization?.Trim(),
            CertificationLevel = cmd.CertificationLevel?.Trim(),
            IsActive           = true,
        };

        _db.Technicians.Add(technician);
        await _db.SaveChangesAsync(ct);
        return technician.Id;
    }
}

// ── Update ──────────────────────────────────────────────────────────────────

public record UpdateTechnicianCommand(
    Guid Id,
    string FullName,
    string EmployeeCode,
    string? Phone,
    string? Email,
    string? Specialization,
    string? CertificationLevel,
    bool IsActive
) : IRequest<bool>;

public class UpdateTechnicianCommandHandler : IRequestHandler<UpdateTechnicianCommand, bool>
{
    private readonly IApplicationDbContext _db;

    public UpdateTechnicianCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<bool> Handle(UpdateTechnicianCommand cmd, CancellationToken ct)
    {
        var tech = await _db.Technicians.FirstOrDefaultAsync(t => t.Id == cmd.Id && !t.IsDeleted, ct);
        if (tech == null) return false;

        tech.FullName           = cmd.FullName.Trim();
        tech.EmployeeCode       = cmd.EmployeeCode.Trim().ToUpperInvariant();
        tech.Phone              = cmd.Phone?.Trim();
        tech.Email              = cmd.Email?.Trim();
        tech.Specialization     = cmd.Specialization?.Trim();
        tech.CertificationLevel = cmd.CertificationLevel?.Trim();
        tech.IsActive           = cmd.IsActive;
        tech.UpdatedAt          = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return true;
    }
}
