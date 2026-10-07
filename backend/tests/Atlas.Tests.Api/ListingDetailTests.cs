using System.Net;
using Atlas.Domain.Pricing;
using Atlas.Web.Api.Listings;
using Atlas.Domain.Listings;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace Atlas.Tests.Api;

[Collection(ApiCollection.Name)]
public class ListingDetailTests(ApiFactory factory)
{
    private const string KolektibId = "5f0c2e64-0001-4a11-9c1a-000000000001"; // seeded seller

    [Fact]
    public async Task A_Seller_Without_A_Profile_Shows_Their_Account_Name()
    {
        var (seller, sellerId) = await factory.SignInNewUserAsync("Ana Reyes");
        var listing = await TestListings.CreateAsync(seller);
        var anon = factory.CreateClient();

        var detail = await (await anon.GetAsync($"/api/listings/{listing.Id}")).DataAsync<ListingDetailDto>();
        detail.Seller!.DisplayName.Should().Be("Ana Reyes");
        detail.Seller.RatingAvg.Should().BeNull();
        detail.Listing.SellerName.Should().Be("Ana Reyes");

        var page = await (await anon.GetAsync($"/api/sellers/{sellerId}")).DataAsync<SellerPageDto>();
        page.Seller.DisplayName.Should().Be("Ana Reyes");
        page.Listings.Should().ContainSingle(l => l.Id == listing.Id);
    }

    [Fact]
    public async Task Detail_Counts_Views_And_Lists_Photos()
    {
        var anon = factory.CreateClient();
        var withImage = (await (await anon.GetAsync("/api/listings?category=pokemon&pageSize=60"))
            .DataAsync<PagedResult<ListingDto>>()).Items.First(l => l.ImageUrl != null);

        var first = await (await anon.GetAsync($"/api/listings/{withImage.Id}")).DataAsync<ListingDetailDto>();
        var second = await (await anon.GetAsync($"/api/listings/{withImage.Id}")).DataAsync<ListingDetailDto>();

        second.Listing.Views.Should().Be(first.Listing.Views + 1);
        first.Listing.Photos.Should().Equal(withImage.ImageUrl);
    }

    [Fact]
    public async Task A_Seeded_Seller_Shows_Real_Stats_Not_Seeded_Ones()
    {
        var page = await (await factory.CreateClient().GetAsync($"/api/sellers/{KolektibId}")).DataAsync<SellerPageDto>();

        page.Seller.DisplayName.Should().Be("Kolektib & Co.");
        page.Seller.RatingCount.Should().Be(0); // the seed claims 312 reviews; there are none
        page.Seller.Verified.Should().BeTrue();
        page.Listings.Should().NotBeEmpty();
    }

    [Fact]
    public async Task Seed_History_Is_Not_Market_Data()
    {
        // a fixed-price listing that really has seed history rows, so the filter is what hides them
        Guid seededId;
        await using (var db = factory.NewDb())
        {
            var keys = await db.PriceHistory.Where(h => h.Source == "seed").Select(h => h.CardIdentityKey).Distinct().ToListAsync();
            keys.Should().NotBeEmpty();
            var ids = keys.Select(Guid.Parse).ToList();
            seededId = await db.Listings
                .Where(l => ids.Contains(l.Id) && l.ListingFormat == ListingFormat.FixedPrice)
                .Select(l => l.Id).FirstAsync();
            (await db.PriceHistory.CountAsync(h => h.CardIdentityKey == seededId.ToString() && h.Source == "seed"))
                .Should().BeGreaterThan(3);
        }

        var detail = await (await factory.CreateClient().GetAsync($"/api/listings/{seededId}")).DataAsync<ListingDetailDto>();

        detail.History.Should().BeEmpty();
        detail.Listing.DealScore.Should().BeNull();
    }

    [Fact]
    public async Task Real_Sales_Chart_And_Score_A_Listing_Ignoring_Seed_Rows()
    {
        var (seller, _) = await factory.SignInNewUserAsync();
        var listing = await TestListings.CreateAsync(seller, price: 900m);
        await using (var db = factory.NewDb())
        {
            for (var i = 0; i < 5; i++)
            {
                db.PriceHistory.Add(new PriceHistory
                {
                    Id = Guid.NewGuid(), CardIdentityKey = listing.Id.ToString(), SalePrice = 1000m,
                    SaleDate = DateTime.UtcNow.AddDays(-i - 1),
                });
                db.PriceHistory.Add(new PriceHistory
                {
                    Id = Guid.NewGuid(), CardIdentityKey = listing.Id.ToString(), SalePrice = 50000m,
                    SaleDate = DateTime.UtcNow.AddDays(-i - 1), Source = "seed",
                });
            }
            await db.SaveChangesAsync();
        }

        var detail = await (await factory.CreateClient().GetAsync($"/api/listings/{listing.Id}")).DataAsync<ListingDetailDto>();

        detail.History.Should().HaveCount(5).And.OnlyContain(p => p.Price == 1000m);
        detail.Listing.DealScore.Should().NotBeNull();
        detail.Listing.DealScore!.MedianPhp.Should().Be(1000m);
    }

    [Fact]
    public async Task An_Unknown_Seller_Is_404() =>
        (await factory.CreateClient().GetAsync($"/api/sellers/{Guid.NewGuid()}"))
            .StatusCode.Should().Be(HttpStatusCode.NotFound);
}
