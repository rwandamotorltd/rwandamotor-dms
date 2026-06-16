using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using Quartz;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Entities;
using RwandaMotor.Infrastructure.BackgroundJobs;
using RwandaMotor.Infrastructure.Persistence;
using RwandaMotor.Infrastructure.Persistence.Seed;
using RwandaMotor.Infrastructure.Services;

namespace RwandaMotor.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services, IConfiguration configuration)
    {
        // Npgsql 8.0: EnableDynamicJson is required for List<T> jsonb columns
        var dataSourceBuilder = new NpgsqlDataSourceBuilder(
            configuration.GetConnectionString("DefaultConnection"));
        dataSourceBuilder.EnableDynamicJson();
        var dataSource = dataSourceBuilder.Build();

        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseNpgsql(
                dataSource,
                b => b.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName)));

        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApplicationDbContext>());

        services.AddIdentity<ApplicationUser, IdentityRole>(options =>
        {
            options.Password.RequireDigit = true;
            options.Password.RequiredLength = 8;
            options.Password.RequireUppercase = true;
            options.Password.RequireNonAlphanumeric = true;
            options.User.RequireUniqueEmail = true;
        })
        .AddEntityFrameworkStores<ApplicationDbContext>()
        .AddDefaultTokenProviders();

        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<IServiceIntervalEngine, ServiceIntervalEngine>();
        services.AddScoped<IRetentionEngine, RetentionEngine>();
        services.AddScoped<ApplicationDbSeeder>();

        services.Configure<SmtpSettings>(configuration.GetSection("Email"));
        services.AddScoped<IEmailService, SmtpEmailService>();

        // Nightly retention evaluation -- runs at 2:00 AM UTC
        services.AddQuartz(q =>
        {
            var jobKey = new JobKey("RetentionEvaluationJob");
            q.AddJob<RetentionEvaluationJob>(opts => opts.WithIdentity(jobKey));
            q.AddTrigger(opts => opts
                .ForJob(jobKey)
                .WithIdentity("RetentionEvaluationJob-trigger")
                .WithCronSchedule("0 0 2 * * ?"));
        });
        services.AddQuartzHostedService(q => q.WaitForJobsToComplete = true);

        // Startup backfill: create service records for closed job cards that predate auto-create
        services.AddHostedService<BackfillJobCardServiceRecordsService>();

        return services;
    }
}
