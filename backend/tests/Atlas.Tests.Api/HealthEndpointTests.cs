using System.Net;
using FluentAssertions;

namespace Atlas.Tests.Api;

[Collection(ApiCollection.Name)]
public class HealthEndpointTests(ApiFactory factory)
{
    private readonly HttpClient _client = factory.CreateClient();

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

        response.Headers.TryGetValues("X-Request-Id", out var values).Should().BeTrue();
        values!.Should().NotBeEmpty();
    }
}
