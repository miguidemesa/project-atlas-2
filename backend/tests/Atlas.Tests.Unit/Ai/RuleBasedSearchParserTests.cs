using Atlas.Infrastructure.Ai;
using FluentAssertions;

namespace Atlas.Tests.Unit.Ai;

public class RuleBasedSearchParserTests
{
    private readonly RuleBasedSearchParser _parser = new();

    [Fact]
    public async Task Reads_Category_Grading_And_K_Prices()
    {
        var parsed = await _parser.ParseAsync("graded wemby nba under ₱30k");

        parsed.Category.Should().Be("basketball");
        parsed.Graded.Should().BeTrue();
        parsed.MaxPrice.Should().Be(30000m);
    }

    [Theory]
    [InlineData("mtg dual lands under 5,000", "magic", 5000)]
    [InlineData("one piece sealed booster box", "one_piece", null)]
    [InlineData("ygo auction", "yugioh", null)]
    public async Task Reads_Every_Game(string query, string category, int? maxPrice)
    {
        var parsed = await _parser.ParseAsync(query);

        parsed.Category.Should().Be(category);
        parsed.MaxPrice.Should().Be(maxPrice);
    }

    [Fact]
    public async Task A_Team_Name_Is_Not_A_Game() =>
        (await _parser.ParseAsync("Orlando Magic Penny Hardaway rookie")).Category.Should().BeNull();

    [Fact]
    public async Task Cgc_Means_Graded() =>
        (await _parser.ParseAsync("cgc 10 umbreon")).Graded.Should().BeTrue();
}
