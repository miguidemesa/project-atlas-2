using Atlas.Application.Listings;
using FluentAssertions;

namespace Atlas.Tests.Unit.Listings;

public class ListingTitleTests
{
    private static CreateListingRequest Request(string category, string player, string set, int? year = null,
        string? number = null, string? parallel = null, string? language = null) =>
        new(category, player, "San Antonio Spurs", year, set, number, language, parallel, false, null, null, "NM",
            "single_card", "fixed", 100m, null);

    [Fact]
    public void Sports_Title_Reads_Year_Set_Player_Parallel_Number() =>
        ListingTitle.Build(Request("basketball", "Victor Wembanyama", "Prizm", 2023, "136", "Silver"))
            .Should().Be("2023 Prizm Victor Wembanyama Silver #136");

    [Fact]
    public void Trading_Card_Title_Reads_Name_Set_Number_Rarity_Language() =>
        ListingTitle.Build(Request("pokemon", "Charizard ex", "151", number: "199/165", parallel: "SIR", language: "ja"))
            .Should().Be("Charizard ex · 151 199/165 · SIR · Japanese");

    [Fact]
    public void English_Is_Not_Spelled_Out() =>
        ListingTitle.Build(Request("magic", "Black Lotus", "Alpha", language: "en"))
            .Should().Be("Black Lotus · Alpha");

    [Fact]
    public void Titles_Are_Capped_At_200_Characters() =>
        ListingTitle.Build(Request("pokemon", new string('x', 200), new string('y', 200))).Length
            .Should().Be(ListingTitle.MaxLength);
}
