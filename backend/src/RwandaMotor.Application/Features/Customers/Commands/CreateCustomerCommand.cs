using FluentValidation;
using MediatR;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Entities;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Application.Features.Customers.Commands;

public record CreateCustomerCommand(
    string FullName,
    string? Phone,
    string? Email,
    string? Address,
    string? City,
    ContactMethod PreferredContactMethod,
    CustomerCategory Category,
    string? CompanyName,
    string? TaxId,
    string? Notes
) : IRequest<Guid>;

public class CreateCustomerCommandValidator : AbstractValidator<CreateCustomerCommand>
{
    public CreateCustomerCommandValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.Email));
        RuleFor(x => x.Phone).MaximumLength(20).When(x => !string.IsNullOrWhiteSpace(x.Phone));
    }
}

public class CreateCustomerCommandHandler : IRequestHandler<CreateCustomerCommand, Guid>
{
    private readonly IApplicationDbContext _db;

    public CreateCustomerCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<Guid> Handle(CreateCustomerCommand cmd, CancellationToken ct)
    {
        var customer = new Customer
        {
            FullName = cmd.FullName.Trim(),
            Phone = cmd.Phone?.Trim(),
            Email = cmd.Email?.Trim().ToLower(),
            Address = cmd.Address,
            City = cmd.City,
            PreferredContactMethod = cmd.PreferredContactMethod,
            Category = cmd.Category,
            CompanyName = cmd.CompanyName,
            TaxId = cmd.TaxId,
            Notes = cmd.Notes
        };

        _db.Customers.Add(customer);
        await _db.SaveChangesAsync(ct);
        return customer.Id;
    }
}
