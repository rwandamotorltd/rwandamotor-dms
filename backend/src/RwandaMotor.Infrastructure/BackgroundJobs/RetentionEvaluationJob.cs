using Microsoft.Extensions.Logging;
using Quartz;
using RwandaMotor.Application.Common.Interfaces;

namespace RwandaMotor.Infrastructure.BackgroundJobs;

/// <summary>Runs nightly to recalculate retention status for all vehicles.</summary>
[DisallowConcurrentExecution]
public class RetentionEvaluationJob : IJob
{
    private readonly IRetentionEngine _engine;
    private readonly ILogger<RetentionEvaluationJob> _logger;

    public RetentionEvaluationJob(IRetentionEngine engine, ILogger<RetentionEvaluationJob> logger)
    {
        _engine = engine;
        _logger = logger;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        _logger.LogInformation("RetentionEvaluationJob started at {Time}", DateTime.UtcNow);
        try
        {
            await _engine.EvaluateAllVehiclesAsync(context.CancellationToken);
            _logger.LogInformation("RetentionEvaluationJob completed at {Time}", DateTime.UtcNow);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "RetentionEvaluationJob failed");
            throw;
        }
    }
}
