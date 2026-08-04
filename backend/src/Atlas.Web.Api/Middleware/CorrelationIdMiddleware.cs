namespace Atlas.Web.Api.Middleware;

/// <summary>
/// Ensures every request carries a correlation ID, echoing it back on the
/// response so logs and client-side debugging share one trace key.
/// </summary>
public class CorrelationIdMiddleware(RequestDelegate next)
{
    public const string HeaderName = "X-Request-Id";

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = context.Request.Headers[HeaderName].FirstOrDefault()
            ?? Guid.NewGuid().ToString("N");

        context.Items["CorrelationId"] = correlationId;
        context.Response.Headers[HeaderName] = correlationId;

        await next(context);
    }
}
