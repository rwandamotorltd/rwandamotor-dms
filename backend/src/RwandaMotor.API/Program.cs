using System.Text;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using RwandaMotor.Application.Common.Behaviours;
using RwandaMotor.Infrastructure;
using RwandaMotor.Infrastructure.Persistence.Seed;
using Serilog;

// Fix Npgsql 6+ DateTime UTC requirement — must be before any EF/Npgsql code
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/rwandamotor-.log", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

// Infrastructure (DB, Identity, Engines, Quartz)
builder.Services.AddInfrastructure(builder.Configuration);

// MediatR + Validation Pipeline
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(RwandaMotor.Application.Features.Auth.Commands.LoginCommand).Assembly);
    cfg.RegisterServicesFromAssembly(typeof(RwandaMotor.Infrastructure.Services.ServiceIntervalEngine).Assembly);
});
builder.Services.AddValidatorsFromAssembly(typeof(RwandaMotor.Application.Features.Auth.Commands.LoginCommand).Assembly);
builder.Services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehaviour<,>));

// Current User Service
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<RwandaMotor.Application.Common.Interfaces.ICurrentUserService,
    RwandaMotor.API.Extensions.CurrentUserService>();

// JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"]!;
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("Admin", policy => policy.RequireRole("Admin"));
    options.AddPolicy("TechnicalDirector", policy => policy.RequireRole("Admin", "TechnicalDirector"));
    options.AddPolicy("CRMOfficer", policy => policy.RequireRole("Admin", "TechnicalDirector", "CRMOfficer"));
    options.AddPolicy("CRE", policy => policy.RequireRole("Admin", "CRE"));
});

// CORS
var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddPolicy("DmsPolicy", policy =>
        policy.SetIsOriginAllowed(origin =>
        {
            if (allowedOrigins.Contains(origin)) return true;
            // Allow all Vercel preview deployments automatically
            if (Uri.TryCreate(origin, UriKind.Absolute, out var uri) &&
                uri.Host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase)) return true;
            return false;
        })
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

// Controllers + Swagger
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        // Allow string ↔ enum round-trip (frontend sends "Phone", "Retail", etc.)
        opts.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "RwandaMotor DMS API",
        Version = "v1",
        Description = "Retention & Service Intelligence Platform — Rwanda Multi-Brand Automotive DMS"
    });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter: Bearer {token}"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Run migrations and seed database on startup
using (var scope = app.Services.CreateScope())
{
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<RwandaMotor.Infrastructure.Persistence.ApplicationDbContext>();
        await db.Database.MigrateAsync();
        var seeder = scope.ServiceProvider.GetRequiredService<ApplicationDbSeeder>();
        await seeder.SeedAsync();
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Database migration/seeding failed");
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "RwandaMotor DMS API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseSerilogRequestLogging();
app.UseMiddleware<RwandaMotor.API.Middleware.ExceptionHandlingMiddleware>();
app.UseCors("DmsPolicy");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
