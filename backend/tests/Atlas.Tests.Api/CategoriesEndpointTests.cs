using Atlas.Application.Listings;
using Atlas.Domain.Auctions;
using Atlas.Domain.Listings;
using Atlas.Infrastructure.Persistence;
using Atlas.Web.Api.Controllers;
using FluentAssertions;

namespace Atlas.Tests.Api;

[Collection(ApiCollection.Name)]
public class CategoriesEndpointTests(ApiFactory factory)
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Lists_Every_Category_In_Order_With_Live_Counts()
    {
        var categories = await (await _client.GetAsync("/api/categories")).DataAsync<List<CategoryDto>>();

        categories.Select(c => c.Slug).Should().Equal(CategoryList.All.Select(c => c.Slug));
        categories.Single(c => c.Slug == "basketball").ActiveListings.Should().BeGreaterThan(0); // seeded NBA, renamed
        categories.Single(c => c.Slug == "lorcana").ActiveListings.Should().BeGreaterThan(0);    // seeded Disney, renamed
        categories.Single(c => c.Slug == "gundam").ActiveListings.Should().Be(0);
        categories.Single(c => c.Slug == "magic").Name.Should().Be("Magic: The Gathering");
    }

    [Fact]
    public async Task Auction_That_Ended_A_Minute_Ago_Is_Not_Live()
    {
        var (_, sellerId) = await factory.SignInNewUserAsync("Auction Seller");
        var now = DateTime.UtcNow;
        var ended = NewAuctionListing(sellerId, "ended", now, now.AddMinutes(-1));
        var running = NewAuctionListing(sellerId, "running", now, now.AddHours(1));
        await using var db = factory.NewDb();
        db.Listings.AddRange(ended.Listing, running.Listing);
        db.Auctions.AddRange(ended.Auction, running.Auction);
        await db.SaveChangesAsync();

        var liveIds = db.LiveListings(now).Where(l => l.Category == "digimon").Select(l => l.Id).ToList();

        liveIds.Should().Contain(running.Listing.Id).And.NotContain(ended.Listing.Id);
    }

    private static (Listing Listing, Auction Auction) NewAuctionListing(Guid sellerId, string title, DateTime now, DateTime endTime)
    {
        var id = Guid.NewGuid();
        var listing = new Listing
        {
            Id = id, SellerId = sellerId, Title = title, Category = "digimon", Player = title, Set = "BT1",
            Price = 100m, ListingFormat = ListingFormat.Auction, Status = ListingStatus.Active,
        };
        var auction = new Auction { ListingId = id, StartPrice = 100m, EndTime = endTime, Status = AuctionStatus.Active };
        return (listing, auction);
    }
}
