import io

# 1. DI wiring
p = "src/Atlas.Infrastructure/DI/ServiceCollectionExtensions.cs"
s = open(p).read()
if "ISearchQueryParser" not in s:
    s = s.replace('''        if (!string.IsNullOrWhiteSpace(config["OpenAI:ApiKey"]))
            services.AddHttpClient<ICardVisionService, OpenAiVisionClient>();
        else
            services.AddSingleton<ICardVisionService, MockCardVisionService>();''',
'''        if (!string.IsNullOrWhiteSpace(config["OpenAI:ApiKey"]))
            services.AddHttpClient<ICardVisionService, OpenAiVisionClient>();
        else
            services.AddSingleton<ICardVisionService, MockCardVisionService>();

        // NL search: LLM parse when keyed, deterministic rules otherwise
        if (!string.IsNullOrWhiteSpace(config["OpenAI:ApiKey"]))
            services.AddHttpClient<ISearchQueryParser, LlmSearchParser>();
        else
            services.AddSingleton<ISearchQueryParser, RuleBasedSearchParser>();''')
open(p, "w").write(s)
print("DI patched:", "ISearchQueryParser" in open(p).read())

# 2. SearchController
ctrl = '''using Atlas.Application.Ai;
using Microsoft.AspNetCore.Mvc;

namespace Atlas.Web.Api.Controllers;

public sealed record ParseRequest(string Query);

/// <summary>Free-text to structured filters for the browse grid.</summary>
[ApiController]
[Route("api/search")]
public class SearchController(ISearchQueryParser parser) : ControllerBase
{
    [HttpPost("parse")]
    public async Task<IActionResult> Parse([FromBody] ParseRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Query))
            return BadRequest(new { error = "Enter a search phrase." });

        var parsed = await parser.ParseAsync(request.Query.Trim(), ct);
        return Ok(new { data = new
        {
            category = parsed.Category,
            format = parsed.Format,
            type = parsed.Type,
            graded = parsed.Graded,
            maxPrice = parsed.MaxPrice,
            player = parsed.Player,
        } });
    }
}
'''
open("src/Atlas.Web.Api/Controllers/SearchController.cs", "w").write(ctrl)
print("controller written")

# 3. unit tests
test = '''using Atlas.Application.Ai;
using FluentAssertions;

namespace Atlas.Tests.Unit.Ai;

public class RuleBasedSearchParserTests
{
    private readonly RuleBasedSearchParser _p = new();

    [Fact]
    public async Task Parses_Category_Grade_And_Price()
    {
        var r = await _p.ParseAsync("graded wemby under \u20b130,000");
        r.Category.Should().Be("nba");
        r.Graded.Should().BeTrue();
        r.MaxPrice.Should().Be(30000m);
    }

    [Fact]
    public async Task Parses_Pokemon_Auction()
    {
        var r = await _p.ParseAsync("pokemon charizard auction");
        r.Category.Should().Be("pokemon");
        r.Format.Should().Be("auction");
    }

    [Fact]
    public async Task Parses_OnePiece_Sealed_Price()
    {
        var r = await _p.ParseAsync("one piece sealed box under 5000");
        r.Category.Should().Be("one_piece");
        r.Type.Should().Be("hobby_box");
        r.MaxPrice.Should().Be(5000m);
    }

    [Fact]
    public async Task Parses_Lorcana_BuyNow_Single()
    {
        var r = await _p.ParseAsync("lorcana singles buy now");
        r.Category.Should().Be("disney");
        r.Type.Should().Be("single_card");
        r.Format.Should().Be("fixed");
    }

    [Fact]
    public async Task Unstructured_Text_Yields_Nulls()
    {
        var r = await _p.ParseAsync("something rare");
        r.Category.Should().BeNull();
        r.Graded.Should().BeNull();
        r.MaxPrice.Should().BeNull();
    }
}
'''
import os
os.makedirs("tests/Atlas.Tests.Unit/Ai", exist_ok=True)
open("tests/Atlas.Tests.Unit/Ai/RuleBasedSearchParserTests.cs", "w").write(test)
print("tests written")
