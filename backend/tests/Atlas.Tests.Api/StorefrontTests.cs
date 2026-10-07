using System.Net;
using System.Net.Http.Json;
using Atlas.Web.Api.Listings;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace Atlas.Tests.Api;

/// <summary>
/// The storefront is cached for 60s per category, so each test reads a category
/// no other test reads.
/// </summary>
[Collection(ApiCollection.Name)]
public class StorefrontTests(ApiFactory factory)
{
    private readonly HttpClient _anon = factory.CreateClient();

    private sealed record OrderCreated(Guid Id);

    private async Task<StorefrontDto> StorefrontAsync(string? category = null) =>
        await (await _anon.GetAsync(category is null ? "/api/storefront" : $"/api/storefront?category={category}"))
            .DataAsync<StorefrontDto>();

    [Fact]
    public async Task Home_Shelves_Come_From_Real_Listings()
    {
        var home = await StorefrontAsync();

        home.ActiveListings.Should().BeGreaterThan(0);
        home.Categories.Should().Contain(c => c.Category == "pokemon");
        home.Spotlight.Should().NotBeEmpty().And.HaveCountLessThanOrEqualTo(5).And.OnlyContain(l => l.ImageUrl != null);
        home.Grails.Should().NotBeEmpty().And.BeInDescendingOrder(l => l.Price).And.OnlyContain(l => l.Format == "fixed");
        home.EndingSoon.Should().NotBeEmpty().And.BeInAscendingOrder(l => l.EndsAt).And.OnlyContain(l => l.Format == "auction");
        home.NewArrivals.Should().NotBeEmpty().And.BeInDescendingOrder(l => l.CreatedAt);
        home.Sets.Should().BeEmpty(); // sets are a hub shelf
    }

    [Fact]
    public async Task An_Ended_Auction_Leaves_The_Hub()
    {
        var (seller, _) = await factory.SignInNewUserAsync();
        var auction = await TestListings.CreateAsync(seller, category: "digimon", format: "auction");
        await using (var db = factory.NewDb())
            await db.Auctions.Where(a => a.ListingId == auction.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(a => a.EndTime, DateTime.UtcNow.AddMinutes(-1)));

        var hub = await StorefrontAsync("digimon");

        hub.EndingSoon.Should().NotContain(l => l.Id == auction.Id);
        hub.ActiveListings.Should().Be(0);
    }

    [Fact]
    public async Task An_Ended_Auction_Is_On_No_Shelf()
    {
        var (seller, _) = await factory.SignInNewUserAsync();
        var auction = await TestListings.CreateAsync(seller, category: "shadowverse", format: "auction", price: 9_000_000m);
        await using (var db = factory.NewDb())
            await db.Auctions.Where(a => a.ListingId == auction.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(a => a.EndTime, DateTime.UtcNow.AddMinutes(-1)));

        var hub = await StorefrontAsync("shadowverse");

        new[] { hub.Spotlight, hub.Trending, hub.Grails, hub.EndingSoon, hub.NewArrivals }
            .SelectMany(shelf => shelf).Should().NotContain(l => l.Id == auction.Id);
        hub.Sets.Should().BeEmpty();
    }

    [Fact]
    public async Task A_Hub_Lists_Its_Sets_With_A_From_Price() =>
        (await StorefrontAsync("pokemon")).Sets
            .Should().ContainEquivalentOf(new SetSummaryDto("Base Set", 2, 15000m)); // seeded Charizard (auction) + Blastoise

    [Fact]
    public async Task Recently_Sold_Comes_From_Paid_Orders()
    {
        var (seller, _) = await factory.SignInNewUserAsync();
        var listing = await TestListings.CreateAsync(seller, category: "vanguard", price: 2500m);
        var (buyer, _) = await factory.SignInNewUserAsync("Buyer");
        var order = await (await buyer.PostAsJsonAsync("/api/orders",
                new { listingId = listing.Id, shippingAddress = "123 Test Street, Barangay Test, Quezon City" }))
            .DataAsync<OrderCreated>();
        (await buyer.PostAsJsonAsync($"/api/orders/{order.Id}/pay", new { })).EnsureSuccessStatusCode(); // Mock provider in tests

        var hub = await StorefrontAsync("vanguard");

        hub.RecentlySold.Should().ContainSingle(s => s.ListingId == listing.Id && s.Price == 2500m);
    }

    [Fact]
    public async Task Unknown_Category_Is_Rejected() =>
        (await _anon.GetAsync("/api/storefront?category=nba")).StatusCode.Should().Be(HttpStatusCode.BadRequest);
}
