using Atlas.Application;
using Atlas.Infrastructure.DI;
using Atlas.Infrastructure.Persistence;
using Atlas.Web.Api.Middleware;
using Microsoft.EntityFrameworkCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, lc) => lc.ReadFrom.Configuration(ctx.Configuration));

// Application + infrastructure services
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddApplication();

var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
    ?? ["http://localhost:3000", "http://localhost:3001"];

builder.Services.AddControllers();
builder.Services.AddHealthChecks();
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
    {
        if (corsOrigins.Any(o => o == "*"))
        {
            policy.SetIsOriginAllowed(_ => true)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        }
        else
        {
            policy.WithOrigins(corsOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        }
    }));

var app = builder.Build();

// serve locally-stored listing photos
var uploadsRoot = Path.Combine(app.Environment.ContentRootPath, "App_Data", "uploads");
Directory.CreateDirectory(uploadsRoot);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsRoot),
    RequestPath = "/uploads",
});

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AtlasDbContext>();
    await db.Database.MigrateAsync();

    if (app.Environment.IsDevelopment() || builder.Configuration.GetValue("SeedData", false))
    {
        await DbSeeder.SeedAsync(scope.ServiceProvider);
    }
}

app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<GlobalExceptionHandler>();
app.UseSerilogRequestLogging();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/api/health");

app.Run();

/// <summary>
/// Exposes the entry point to integration tests via WebApplicationFactory.
/// </summary>
public partial class Program;
