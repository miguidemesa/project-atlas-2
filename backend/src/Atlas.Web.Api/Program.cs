using Atlas.Infrastructure.DI;
using Atlas.Web.Api.Middleware;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, lc) => lc.ReadFrom.Configuration(ctx.Configuration));

// Application + infrastructure services
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddControllers();
builder.Services.AddHealthChecks();
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()));

var app = builder.Build();

app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<GlobalExceptionHandler>();
app.UseSerilogRequestLogging();

app.UseCors();
app.MapControllers();
app.MapHealthChecks("/api/health");

app.Run();

/// <summary>
/// Exposes the entry point to integration tests via WebApplicationFactory.
/// </summary>
public partial class Program;
