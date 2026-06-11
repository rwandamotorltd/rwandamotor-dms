using FluentValidation;
using MediatR;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.Customers.Commands;

public record UpdateCustomerCommand(
    Guid Id,
    string FullName,
    string? Phone,
    string? Email,
    string? Address,
    string? City,
    ContactMethod PreferredContactMethod,
    CustomerCategory Category,
    string? CompanyName,
    string? TaxId,
    string? Notes,
    bool IsActive
) : IRequest<bool>;

public class UpdateCustomerCommandValidator : AbstractValidator<UpdateCustomerCommand>
{
    public UpdateCustomerCommandValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.Email));
        RuleFor(x => x.Phone).MaximumLength(20).When(x => !string.IsNullOrWhiteSpace(x.Phone));
    }
}

public class UpdateCustomerCommandHandler : IRequestHandler<UpdateCustomerCommand, bool>
{
    private readonly IApplicationDbContext _db;

    public UpdateCustomerCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<bool> Handle(UpdateCustomerCommand cmd, CancellationToken ct)
    {
        var customer = await _db.Customers.FindAsync([cmd.Id], ct)
            ?? throw new KeyNotFoundException($"Customer {cmd.Id} not found");

        customer.FullName = cmd.FullName.Trim();
        customer.Phone = cmd.Phone?.Trim();
        customer.Email = cmd.Email?.Trim().ToLower();
        customer.Address = cmd.Address;
        customer.City = cmd.City;
        customer.PreferredContactMethod = cmd.PreferredContactMethod;
        customer.Category = cmd.Category;
        customer.CompanyName = cmd.CompanyName;
        customer.TaxId = cmd.TaxId;
        customer.Notes = cmd.Notes;
        customer.IsActive = cmd.IsActive;

        await _db.SaveChangesAsync(ct);
        return true;
    }
}
