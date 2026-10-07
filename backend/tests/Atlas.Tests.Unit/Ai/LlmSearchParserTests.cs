using System.Net;
using System.Text.Json;
using Atlas.Infrastructure.Ai;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace Atlas.Tests.Unit.Ai;

public class LlmSearchParserTests
{
    /// <summary>Answers every request like the chat completions API, with the given message content.</summary>
    private sealed class StubHandler(string content) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(JsonSerializer.Serialize(new { choices = new[] { new { message = new { content } } } })),
            });
    }

    private static LlmSearchParser Parser(string llmJson) => new(
        new HttpClient(new StubHandler(llmJson)),
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["OpenAI:ApiKey"] = "test" }).Build(),
        new RuleBasedSearchParser(),
        NullLogger<LlmSearchParser>.Instance);

    [Fact]
    public async Task Keeps_A_Category_From_The_List() =>
        (await Parser("""{"category":"lorcana"}""").ParseAsync("enchanted elsa")).Category.Should().Be("lorcana");

    [Fact]
    public async Task Replaces_An_Invented_Category_With_The_Keyword_Match()
    {
        var parsed = await Parser("""{"category":"nba","maxPrice":5000}""").ParseAsync("nba cards under 5000");

        parsed.Category.Should().Be("basketball");
        parsed.MaxPrice.Should().Be(5000m);
    }
}
