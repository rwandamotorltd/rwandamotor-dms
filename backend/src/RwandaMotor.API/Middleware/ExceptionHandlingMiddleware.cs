using System.Net;
using System.Text.Json;
using FluentValidation;

namespace RwandaMotor.API.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ValidationException ex)
        {
            context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
            context.Response.ContentType = "application/json";
            var errors = ex.Errors.Select(e => $"{e.PropertyName}: {e.ErrorMessage}").ToList();
            await context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                success = false,
                message = "Validation failed",
                errors
            }));
        }
        catch (UnauthorizedAccessException ex)
        {
            context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new { success = false, message = ex.Message }));
        }
        catch (KeyNotFoundException ex)
        {
            context.Response.StatusCode = (int)HttpStatusCode.NotFound;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new { success = false, message = ex.Message }));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
            context.Response.ContentType = "application/json";

            // Walk the full inner-exception chain to surface the root SQL error
            var root = ex;
            while (root.InnerException != null) root = root.InnerException;
            var rootMsg = root == ex ? null : root.Message;

            await context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                success = false,
                message = rootMsg != null ? $"{ex.Message} → {rootMsg}" : ex.Message,
                detail = rootMsg
            }));
        }
    }
}
