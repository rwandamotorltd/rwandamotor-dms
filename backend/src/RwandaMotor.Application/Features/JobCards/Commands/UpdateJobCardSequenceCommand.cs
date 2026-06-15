using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Entities;

namespace RwandaMotor.Application.Features.JobCards.Commands;

/// <summary>Admin: set the starting sequence for a given year before any cards are issued.</summary>
public record UpdateJobCardSequenceCommand(int Year, int StartingSequence) : IRequest<bool>;

public class UpdateJobCardSequenceCommandValidator : AbstractValidator<UpdateJobCardSequenceCommand>
{
    public UpdateJobCardSequenceCommandValidator()
    {
        RuleFor(x => x.Year).InclusiveBetween(2020, 2099);
        RuleFor(x => x.StartingSequence).GreaterThanOrEqualTo(1);
    }
}

public class UpdateJobCardSequenceCommandHandler : IRequestHandler<UpdateJobCardSequenceCommand, bool>
{
    private readonly IApplicationDbContext _db;

    public UpdateJobCardSequenceCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<bool> Handle(UpdateJobCardSequenceCommand cmd, CancellationToken ct)
    {
        var seq = await _db.JobCardSequences
            .FirstOrDefaultAsync(s => s.Year == cmd.Year, ct);

        if (seq == null)
        {
            _db.JobCardSequences.Add(new JobCardSequence
            {
                Year = cmd.Year,
                StartingSequence = cmd.StartingSequence,
                CurrentSequence = 0
            });
        }
        else
        {
            seq.StartingSequence = cmd.StartingSequence;
            // Only reset CurrentSequence if no cards have been issued yet this year
            if (seq.CurrentSequence == 0)
                seq.CurrentSequence = 0; // stays 0; first card will pick up StartingSequence
        }

        await _db.SaveChangesAsync(ct);
        return true;
    }
}
