using Atlas.Domain.Shared;
using Microsoft.AspNetCore.Mvc;

namespace Atlas.Web.Api.Middleware;

/// <summary>
/// Translates unhandled exceptions into safe, structured ProblemDetails
/// responses. Business rule violations map to 400; everything else is a
/// logged 500 with no internal details leaked to the client.
/// </summary>
public class GlobalExceptionHandler(RequestDelegate next, ILogger<GlobalExceptionHandler> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (DomainException ex)
        {
            logger.LogInformation("Business rule violation on {Method} {Path}: {Message}",
                context.Request.Method, context.Request.Path, ex.Message);

            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Business rule violation",
                Detail = ex.Message
            });
        }
        catch (Exception ex)
        {
            var correlationId = context.Items["CorrelationId"] as string;
            logger.LogError(ex, "Unhandled exception on {Method} {Path} (correlation {CorrelationId})",
                context.Request.Method, context.Request.Path, correlationId);

            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await context.Response.WriteAsJsonAsync(new ProblemDetails
            {
                Status = StatusCodes.Status500InternalServerError,
                Title = "Internal server error"
            });
        }
    }
}
