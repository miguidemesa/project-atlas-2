using System.Net;
using Atlas.Web.Api.Listings;
using FluentAssertions;

namespace Atlas.Tests.Api;

[Collection(ApiCollection.Name)]
public class CardGroupTests(ApiFactory factory)
{
    private readonly HttpClient _anon = factory.CreateClient();

    [Fact]
    public async Task Same_Card_From_Several_Sellers_Is_One_Group_With_The_Lowest_Price()
    {
        var (a, _) = await factory.SignInNewUserAsync("Seller A");
        var (b, _) = await factory.SignInNewUserAsync("Seller B");
        var cheap = await TestListings.CreateAsync(a, category: "star_wars_unlimited", price: 900m, set: "Spark of Rebellion", player: "Darth Vader", cardNumber: "10");
        await TestListings.CreateAsync(b, category: "star_wars_unlimited", price: 1400m, set: "spark of rebellion", player: "darth  vader", cardNumber: "10");
        await TestListings.CreateAsync(b, category: "star_wars_unlimited", price: 700m, set: "Shadows of the Galaxy", player: "Darth Vader", cardNumber: "10");

        var groups = await (await _anon.GetAsync("/api/listings/groups?category=star_wars_unlimited&take=24")).DataAsync<List<CardGroupDto>>();

        var vader = groups.Single(g => g.Lead.Set == "Spark of Rebellion");
        vader.Sellers.Should().Be(2);
        vader.Listings.Should().Be(2);
        vader.FromPrice.Should().Be(900m);
        vader.Lead.Id.Should().Be(cheap.Id);
        groups.Should().ContainSingle(g => g.Lead.Set == "Shadows of the Galaxy" && g.Sellers == 1);

        var compare = await (await _anon.GetAsync($"/api/listings?card={Uri.EscapeDataString(vader.Key)}&pageSize=60")).DataAsync<PagedResult<ListingDto>>();
        compare.Items.Should().HaveCount(2).And.OnlyContain(l => l.Set.ToLower() == "spark of rebellion");
    }

    [Fact]
    public async Task Unknown_Category_Is_Rejected() =>
        (await _anon.GetAsync("/api/listings/groups?category=nba")).StatusCode.Should().Be(HttpStatusCode.BadRequest);

    [Fact]
    public async Task A_Malformed_Card_Key_Is_Rejected() =>
        (await _anon.GetAsync("/api/listings?card=not-a-key")).StatusCode.Should().Be(HttpStatusCode.BadRequest);
}
