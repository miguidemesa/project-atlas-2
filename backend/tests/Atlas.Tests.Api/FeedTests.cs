using System.Net;
using Atlas.Web.Api.Listings;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace Atlas.Tests.Api;

[Collection(ApiCollection.Name)]
public class FeedTests(ApiFactory factory)
{
    private readonly HttpClient _anon = factory.CreateClient();

    private async Task<PagedResult<ListingDto>> FeedAsync(string query) =>
        await (await _anon.GetAsync($"/api/listings?{query}")).DataAsync<PagedResult<ListingDto>>();

    [Fact]
    public async Task An_Auction_That_Ended_A_Minute_Ago_Is_Gone()
    {
        var (seller, _) = await factory.SignInNewUserAsync();
        var auction = await TestListings.CreateAsync(seller, format: "auction");
        await using (var db = factory.NewDb())
            await db.Auctions.Where(a => a.ListingId == auction.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(a => a.EndTime, DateTime.UtcNow.AddMinutes(-1)));

        (await FeedAsync("format=auction&pageSize=60")).Items.Should().NotContain(l => l.Id == auction.Id);
        (await FeedAsync("sort=ending&pageSize=60")).Items.Should().NotContain(l => l.Id == auction.Id);
    }

    [Fact]
    public async Task Ending_Sort_Returns_The_Soonest_Auctions_First()
    {
        var soonest = (await FeedAsync("format=auction&pageSize=60")).Items
            .OrderBy(l => l.EndsAt).Take(3).Select(l => l.Id).ToList();

        var firstPage = (await FeedAsync("sort=ending&pageSize=3")).Items;

        firstPage.Should().HaveCount(3).And.OnlyContain(l => l.Format == "auction");
        firstPage.Select(l => l.Id).Should().Equal(soonest);
    }

    [Fact]
    public async Task Type_Filter_Understands_Snake_Case()
    {
        var items = (await FeedAsync("type=hobby_box&pageSize=60")).Items;

        items.Should().NotBeEmpty().And.OnlyContain(l => l.Type == "hobby_box");
        // the seeded NBA Hoops box is sold by the seeded Three-Point Cebu
        items.Should().Contain(l => l.SellerName == "Three-Point Cebu");
    }

    [Fact]
    public async Task An_Unknown_Type_Is_Rejected() =>
        (await _anon.GetAsync("/api/listings?type=sealed_thing")).StatusCode.Should().Be(HttpStatusCode.BadRequest);

    [Fact]
    public async Task A_Percent_Sign_In_Search_Is_Literal() =>
        (await FeedAsync("q=%25")).Total.Should().Be(0);

    [Theory]
    [InlineData("nba")]
    [InlineData("not_a_game")]
    public async Task Unknown_Category_Is_Rejected(string slug) =>
        (await _anon.GetAsync($"/api/listings?category={slug}")).StatusCode.Should().Be(HttpStatusCode.BadRequest);

    [Fact]
    public async Task Language_And_Price_Filters_Apply()
    {
        (await FeedAsync("language=ja&pageSize=60")).Items
            .Should().NotBeEmpty().And.OnlyContain(l => l.Language == "ja"); // seeded Shanks, Japanese print
        (await FeedAsync("minPrice=100000&pageSize=60")).Items.Should().NotBeEmpty().And.OnlyContain(l => l.Price >= 100000);
    }

    [Fact]
    public async Task Every_Item_Names_Its_Seller() =>
        (await FeedAsync("pageSize=60")).Items.Should().NotBeEmpty()
            .And.OnlyContain(l => !string.IsNullOrWhiteSpace(l.SellerName) && l.SellerName != "Atlas seller");

    [Fact]
    public async Task Popular_Sort_Puts_The_Most_Viewed_First()
    {
        var (seller, _) = await factory.SignInNewUserAsync();
        var listing = await TestListings.CreateAsync(seller);
        for (var i = 0; i < 5; i++)
            (await _anon.GetAsync($"/api/listings/{listing.Id}")).EnsureSuccessStatusCode();

        (await FeedAsync("sort=popular&pageSize=1")).Items.Single().Id.Should().Be(listing.Id);
    }

    [Fact]
    public async Task A_Huge_Page_Number_Returns_An_Empty_Page_Not_A_Server_Error()
    {
        var response = await _anon.GetAsync($"/api/listings?page={int.MaxValue}&pageSize=60");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await response.DataAsync<PagedResult<ListingDto>>()).Items.Should().BeEmpty();
    }

    [Fact]
    public async Task A_Very_Long_Search_Phrase_Is_Accepted()
    {
        var response = await _anon.GetAsync($"/api/listings?q={new string('a', 5000)}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Every_Item_Says_Whether_Its_Seller_Is_Verified()
    {
        var (seller, sellerId) = await factory.SignInNewUserAsync("Verified Shop");
        var listing = await TestListings.CreateAsync(seller, category: "weiss_schwarz");
        await using (var db = factory.NewDb())
        {
            db.SellerProfiles.Add(new Atlas.Domain.Sellers.SellerProfile { UserId = sellerId, DisplayName = "Verified Shop", VerificationBadge = true });
            await db.SaveChangesAsync();
        }

        var item = (await FeedAsync("category=weiss_schwarz&pageSize=60")).Items.Single(l => l.Id == listing.Id);

        item.SellerVerified.Should().BeTrue();
        item.SellerName.Should().Be("Verified Shop");
    }
}
