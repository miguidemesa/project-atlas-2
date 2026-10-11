using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;

namespace Atlas.Tests.Api;

[Collection(ApiCollection.Name)]
public class AppConfigTests(ApiFactory factory)
{
    private sealed record AppConfig(string MinimumAppVersion);

    [Fact]
    public async Task Returns_The_Minimum_App_Version() =>
        (await (await factory.CreateClient().GetAsync("/api/app-config")).DataAsync<AppConfig>())
            .MinimumAppVersion.Should().Be("1.0.0");

    [Fact]
    public async Task Reads_The_Setting_So_Operations_Can_Raise_It()
    {
        await using var host = factory.WithWebHostBuilder(b => b.ConfigureAppConfiguration((_, config) =>
            config.AddInMemoryCollection(new Dictionary<string, string?> { ["App:MinimumVersion"] = "1.4.0" })));

        var config = await (await host.CreateClient().GetAsync("/api/app-config")).DataAsync<AppConfig>();

        config.MinimumAppVersion.Should().Be("1.4.0");
    }
}
