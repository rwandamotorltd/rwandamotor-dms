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

// Fix Npgsql 6+ DateTime UTC requirement -- must be before any EF/Npgsql code
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
        // Allow string <-> enum round-trip (frontend sends "Phone", "Retail", etc.)
        opts.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter());
    })
    .ConfigureApiBehaviorOptions(opts =>
    {
        // Return ApiResponse format on model validation failure instead of ValidationProblemDetails
        opts.InvalidModelStateResponseFactory = ctx =>
        {
            var msg = ctx.ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .FirstOrDefault() ?? "Invalid request";
            return new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(
                new { success = false, message = msg });
        };
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "RwandaMotor DMS API",
        Version = "v1",
        Description = "Retention & Service Intelligence Platform -- Rwanda Multi-Brand Automotive DMS"
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
    var db = scope.ServiceProvider.GetRequiredService<RwandaMotor.Infrastructure.Persistence.ApplicationDbContext>();

    // EF Core migrations
    try { await db.Database.MigrateAsync(); }
    catch (Exception ex) { Log.Error(ex, "EF Core migrations failed"); }

    // Belt-and-suspenders: add email template columns directly if they were
    // not yet created by migrations (idempotent, runs on every startup).
    try
    {
        // Use pg_catalog (not information_schema) — reliable for mixed-case quoted identifiers
        await db.Database.ExecuteSqlRawAsync(@"
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_catalog.pg_attribute a
                    JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
                    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                    WHERE c.relname = 'CompanySettings' AND n.nspname = 'public'
                      AND a.attname = 'EmailJobCardMessage' AND a.attnum > 0 AND NOT a.attisdropped
                ) THEN
                    ALTER TABLE ""CompanySettings"" ADD COLUMN ""EmailJobCardMessage"" text;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_catalog.pg_attribute a
                    JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
                    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                    WHERE c.relname = 'CompanySettings' AND n.nspname = 'public'
                      AND a.attname = 'EmailDeliveryNoteMessage' AND a.attnum > 0 AND NOT a.attisdropped
                ) THEN
                    ALTER TABLE ""CompanySettings"" ADD COLUMN ""EmailDeliveryNoteMessage"" text;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_catalog.pg_attribute a
                    JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
                    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                    WHERE c.relname = 'CompanySettings' AND n.nspname = 'public'
                      AND a.attname = 'ServiceTypesConfig' AND a.attnum > 0 AND NOT a.attisdropped
                ) THEN
                    ALTER TABLE ""CompanySettings"" ADD COLUMN ""ServiceTypesConfig"" text;
                END IF;
            END $$;");
    }
    catch (Exception ex) { Log.Error(ex, "Schema column patch failed"); }

    // Belt-and-suspenders: create AppRoles + DocumentTemplates if migrations failed
    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            DO $$
            BEGIN
                -- DocumentTemplates table
                IF NOT EXISTS (
                    SELECT 1 FROM pg_catalog.pg_class c
                    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                    WHERE c.relname = 'DocumentTemplates' AND n.nspname = 'public'
                ) THEN
                    CREATE TABLE ""DocumentTemplates"" (
                        ""Id""           uuid    NOT NULL,
                        ""DocumentType"" text    NOT NULL,
                        ""Name""         text    NOT NULL,
                        ""PageWidth""    integer NOT NULL,
                        ""PageHeight""   integer NOT NULL,
                        ""FieldsJson""   text    NOT NULL,
                        ""IsDefault""    boolean NOT NULL,
                        ""CreatedAt""    timestamp without time zone NOT NULL,
                        ""UpdatedAt""    timestamp without time zone,
                        ""CreatedBy""    text,
                        ""UpdatedBy""    text,
                        ""IsDeleted""    boolean NOT NULL,
                        ""DeletedAt""    timestamp without time zone,
                        ""DeletedBy""    text,
                        CONSTRAINT ""PK_DocumentTemplates"" PRIMARY KEY (""Id"")
                    );
                    INSERT INTO ""__EFMigrationsHistory"" (""MigrationId"", ""ProductVersion"")
                    VALUES ('20260624071434_AddDocumentTemplates', '9.0.1')
                    ON CONFLICT DO NOTHING;
                END IF;

                -- AppRoles table
                IF NOT EXISTS (
                    SELECT 1 FROM pg_catalog.pg_class c
                    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                    WHERE c.relname = 'AppRoles' AND n.nspname = 'public'
                ) THEN
                    CREATE TABLE ""AppRoles"" (
                        ""Id""          uuid    NOT NULL,
                        ""Name""        text    NOT NULL,
                        ""DisplayName"" text    NOT NULL,
                        ""Description"" text,
                        ""IsBuiltIn""   boolean NOT NULL,
                        CONSTRAINT ""PK_AppRoles"" PRIMARY KEY (""Id"")
                    );
                    CREATE UNIQUE INDEX ""IX_AppRoles_Name"" ON ""AppRoles"" (""Name"");
                    INSERT INTO ""__EFMigrationsHistory"" (""MigrationId"", ""ProductVersion"")
                    VALUES ('20260624081238_AddAppRoles', '9.0.1')
                    ON CONFLICT DO NOTHING;
                END IF;
            END $$;");
    }
    catch (Exception ex) { Log.Error(ex, "Schema table patch failed"); }

    // Seed reference data
    try
    {
        var seeder = scope.ServiceProvider.GetRequiredService<ApplicationDbSeeder>();
        await seeder.SeedAsync();
    }
    catch (Exception ex) { Log.Error(ex, "Database seeding failed"); }
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
