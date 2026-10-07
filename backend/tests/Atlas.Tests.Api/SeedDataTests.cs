using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace Atlas.Tests.Api;

[Collection(ApiCollection.Name)]
public class SeedDataTests(ApiFactory factory)
{
    [Fact]
    public async Task Seeded_Bids_Are_Never_Placed_By_The_Listings_Own_Seller()
    {
        _ = factory.Services; // starts the host, which seeds in Development
        await using var db = factory.NewDb();

        var selfBids = await db.Bids
            .Where(b => db.Listings.Any(l => l.Id == b.ListingId && l.SellerId == b.BidderId))
            .CountAsync();

        (await db.Bids.CountAsync()).Should().BeGreaterThan(0);
        selfBids.Should().Be(0);
    }
}
