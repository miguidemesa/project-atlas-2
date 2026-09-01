using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Atlas.Tests.Api;

public class HealthEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public HealthEndpointTests(WebApplicationFactory<Program> factory)
        => _client = factory.CreateClient();

    [Fact]
    public async Task Health_ReturnsOk()
    {
        var response = await _client.GetAsync("/api/health");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Health_SetsCorrelationIdHeader()
    {
        var response = await _client.GetAsync("/api/health");

        var hasHeader = response.Headers.TryGetValues("X-Request-Id", out var values);
        hasHeader.Should().BeTrue();
        values!.Should().NotBeEmpty();
    }
}
