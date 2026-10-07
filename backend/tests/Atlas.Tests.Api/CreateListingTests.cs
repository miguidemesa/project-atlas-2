using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace Atlas.Tests.Api;

[Collection(ApiCollection.Name)]
public class CreateListingTests(ApiFactory factory)
{
    private sealed record Created(string Title, int? Year, string? Team, bool Numbered, string? SerialNumber);

    [Fact]
    public async Task A_Japanese_Card_Lists_Without_Team_Or_Year()
    {
        var (client, _) = await factory.SignInNewUserAsync();

        var res = await client.PostAsJsonAsync("/api/listings", new
        {
            category = "pokemon", player = "Charizard ex", set = "151", cardNumber = "201/165", language = "ja",
            parallel = "SAR", graded = false, condition = "NM", type = "single_card", format = "fixed", price = 4100m,
        });

        res.StatusCode.Should().Be(HttpStatusCode.Created);
        var listing = await res.DataAsync<Created>();
        listing.Title.Should().Be("Charizard ex · 151 201/165 · SAR · Japanese");
        listing.Year.Should().BeNull();
        listing.Team.Should().BeNull();
    }

    [Fact]
    public async Task A_Legacy_Category_Slug_Is_Rejected()
    {
        var (client, _) = await factory.SignInNewUserAsync();

        var res = await client.PostAsJsonAsync("/api/listings", new
        {
            category = "nba", player = "LeBron James", team = "Lakers", year = 2019, set = "Prizm",
            graded = false, condition = "NM", type = "single_card", format = "fixed", price = 100m,
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task A_Numbered_Sports_Card_Keeps_Its_Serial()
    {
        var (client, _) = await factory.SignInNewUserAsync();

        var res = await client.PostAsJsonAsync("/api/listings", new
        {
            category = "basketball", player = "Victor Wembanyama", team = "San Antonio Spurs", year = 2023, set = "Prizm",
            cardNumber = "136", parallel = "Silver", serialNumber = "07/25", graded = false, condition = "NM",
            type = "single_card", format = "fixed", price = 5000m,
        });

        res.StatusCode.Should().Be(HttpStatusCode.Created);
        var listing = await res.DataAsync<Created>();
        listing.Title.Should().Be("2023 Prizm Victor Wembanyama Silver #136");
        listing.Numbered.Should().BeTrue();
        listing.SerialNumber.Should().Be("07/25");
    }

    [Fact]
    public async Task An_Overlong_Serial_Is_Rejected()
    {
        var (client, _) = await factory.SignInNewUserAsync();

        var res = await client.PostAsJsonAsync("/api/listings", new
        {
            category = "pokemon", player = "Pikachu", set = "Base", serialNumber = new string('9', 51), graded = false,
            condition = "NM", type = "single_card", format = "fixed", price = 100m,
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
