using System.Text.RegularExpressions;
using Atlas.Application.Listings;
using FluentAssertions;

namespace Atlas.Tests.Unit.Listings;

public class CategoryListTests
{
    [Fact]
    public void Slugs_Are_Unique_Lowercase_Snake_Case()
    {
        CategoryList.All.Select(c => c.Slug).Should().OnlyHaveUniqueItems();
        CategoryList.All.Should().OnlyContain(c => Regex.IsMatch(c.Slug, "^[a-z0-9_]+$"));
    }

    [Fact]
    public void Every_Category_Has_A_Known_Group_And_A_Valid_Hue() =>
        CategoryList.All.Should().OnlyContain(c =>
            (c.Group == CategoryList.Tcg || c.Group == CategoryList.Sports || c.Group == CategoryList.NonSport)
            && c.Hue >= 0 && c.Hue < 360);

    [Fact]
    public void No_Alias_Belongs_To_Two_Categories() =>
        CategoryList.All.SelectMany(c => c.Aliases).Should().OnlyHaveUniqueItems();

    [Theory]
    [InlineData("graded wemby nba rookie", "basketball")]
    [InlineData("MTG dual lands", "magic")]
    [InlineData("Magic: The Gathering black lotus", "magic")]
    [InlineData("ygo blue eyes", "yugioh")]
    [InlineData("Yu-Gi-Oh! LOB", "yugioh")]
    [InlineData("pokémon 151 SIR", "pokemon")]
    [InlineData("american football rookies", "american_football")]
    [InlineData("football world cup stickers", "soccer")]
    [InlineData("lorcana enchanted", "lorcana")]
    public void MatchAlias_Finds_The_Category(string text, string expected) =>
        CategoryList.MatchAlias(text).Should().Be(expected);

    [Theory]
    [InlineData("Orlando Magic Penny Hardaway")] // an NBA team, not Magic: The Gathering
    [InlineData("fabulous holo")]               // "fab" only counts as a whole word
    [InlineData("")]
    public void MatchAlias_Needs_A_Whole_Word_Alias(string text) =>
        CategoryList.MatchAlias(text).Should().BeNull();

    [Fact]
    public void IsValid_Rejects_Unknown_And_Legacy_Slugs()
    {
        CategoryList.IsValid("pokemon").Should().BeTrue();
        CategoryList.IsValid("nba").Should().BeFalse();
        CategoryList.IsValid("disney").Should().BeFalse();
        CategoryList.IsValid(null).Should().BeFalse();
    }

    [Fact]
    public void IsSports_Only_For_Sports_Categories()
    {
        CategoryList.IsSports("basketball").Should().BeTrue();
        CategoryList.IsSports("pokemon").Should().BeFalse();
        CategoryList.IsSports("nope").Should().BeFalse();
    }
}
