using MediatR;
using RwandaMotor.Application.Common.Interfaces;

namespace RwandaMotor.Application.Features.Retention.Queries;

public record GetRetentionAnalyticsQuery(
    int TrendMonths = 12,
    int? CohortYear = null
) : IRequest<RetentionAnalyticsDto>;

public class GetRetentionAnalyticsQueryHandler : IRequestHandler<GetRetentionAnalyticsQuery, RetentionAnalyticsDto>
{
    private readonly IRetentionEngine _engine;

    public GetRetentionAnalyticsQueryHandler(IRetentionEngine engine) => _engine = engine;

    public async Task<RetentionAnalyticsDto> Handle(GetRetentionAnalyticsQuery q, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var yearStart = new DateTime(now.Year, 1, 1);

        var monthly = await _engine.GetRetentionSummaryAsync(RetentionPeriod.Monthly, now, ct);
        var quarterly = await _engine.GetRetentionSummaryAsync(RetentionPeriod.Quarterly, now, ct);
        var sixMonth = await _engine.GetRetentionSummaryAsync(RetentionPeriod.SixMonth, now, ct);
        var yearly = await _engine.GetRetentionSummaryAsync(RetentionPeriod.Yearly, now, ct);
        var trend = await _engine.GetRetentionTrendAsync(q.TrendMonths, ct);
        var byBrand = await _engine.GetRetentionByBrandAsync(yearStart, now, ct);
        var cohortYear = q.CohortYear ?? now.Year - 1;
        var cohorts = await _engine.GetCohortRetentionAsync(cohortYear, ct);

        return new RetentionAnalyticsDto(monthly, quarterly, sixMonth, yearly, trend, byBrand, cohorts);
    }
}

public record RetentionAnalyticsDto(
    RetentionSummaryDto Monthly,
    RetentionSummaryDto Quarterly,
    RetentionSummaryDto SixMonth,
    RetentionSummaryDto Yearly,
    List<RetentionTrendPointDto> Trend,
    List<BrandRetentionDto> ByBrand,
    List<CohortRetentionDto> Cohorts);
