using System.Net.Http.Headers;
using System.Net.Http.Json;
using Atlas.Infrastructure.Authentication;
using Atlas.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Atlas.Tests.Api;

/// <summary>
/// Boots the real API against a throwaway Postgres database: dropped once per
/// test run, then migrated and seeded by Program.cs (Development environment).
/// ATLAS_TEST_DB must name a database containing "test".
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    public static readonly string ConnectionString =
        Environment.GetEnvironmentVariable("ATLAS_TEST_DB")
        ?? "Host=127.0.0.1;Port=5432;Database=atlas_test;Username=postgres;Password=postgres";

    public ApiFactory()
    {
        EnsureDisposableDatabase(ConnectionString);
        // read by WebApplication.CreateBuilder when the first client is created
        Environment.SetEnvironmentVariable("ConnectionStrings__DefaultConnection", ConnectionString);
        // pinned, so tests never depend on the payment provider's built-in fallback
        Environment.SetEnvironmentVariable("Payments__Provider", "Mock");
        using var db = NewDb();
        db.Database.EnsureDeleted();
    }

    /// <summary>Refuses to run against a database that doesn't look disposable.</summary>
    public static void EnsureDisposableDatabase(string connectionString)
    {
        var database = new NpgsqlConnectionStringBuilder(connectionString).Database;
        if (database is null || !database.Contains("test", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException(
                $"Refusing to drop database '{database}'. ATLAS_TEST_DB must name a database containing 'test'.");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder) => builder.UseEnvironment("Development");

    public AtlasDbContext NewDb() =>
        new(new DbContextOptionsBuilder<AtlasDbContext>().UseNpgsql(ConnectionString).Options);

    /// <summary>Registers a brand-new account and returns a client signed in as it.</summary>
    public async Task<(HttpClient Client, Guid UserId)> SignInNewUserAsync(string name = "Test User")
    {
        var client = CreateClient();
        var email = $"user-{Guid.NewGuid():N}@test.local";
        var res = await client.PostAsJsonAsync("/api/auth/register", new { email, name, password = "Password123" });
        var auth = await res.DataAsync<AuthPayload>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.Tokens.AccessToken);
        return (client, auth.User.Id);
    }

    public sealed record AuthPayload(TokenResponse Tokens, AuthUserDto User);
}
