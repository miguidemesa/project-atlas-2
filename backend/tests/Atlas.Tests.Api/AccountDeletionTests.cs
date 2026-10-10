using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Atlas.Domain.Listings;
using Atlas.Domain.Notifications;
using Atlas.Domain.Offers;
using Atlas.Domain.Orders;
using Atlas.Domain.Reviews;
using Atlas.Domain.Wallet;
using Atlas.Web.Api.Listings;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace Atlas.Tests.Api;

[Collection(ApiCollection.Name)]
public class AccountDeletionTests(ApiFactory factory)
{
    private const string Address = "123 Test Street, Barangay Test, Quezon City";

    private sealed record ErrorBody(string Error);
    private sealed record OrderCreated(Guid Id);

    private static async Task<string> RefusalAsync(HttpClient client)
    {
        var res = await client.DeleteAsync("/api/me");
        res.StatusCode.Should().Be(HttpStatusCode.Conflict);
        return (await res.Content.ReadFromJsonAsync<ErrorBody>())!.Error;
    }

    private async Task<(HttpClient Seller, HttpClient Buyer, Guid OrderId)> OpenOrderAsync()
    {
        var (seller, _) = await factory.SignInNewUserAsync();
        var (buyer, _) = await factory.SignInNewUserAsync("Buyer");
        var listing = await TestListings.CreateAsync(seller);
        var order = await (await buyer.PostAsJsonAsync("/api/orders", new { listingId = listing.Id, shippingAddress = Address }))
            .DataAsync<OrderCreated>();
        return (seller, buyer, order.Id);
    }

    [Fact]
    public async Task Refuses_While_An_Order_Is_Open()
    {
        var (seller, buyer, _) = await OpenOrderAsync();

        (await RefusalAsync(buyer)).Should().Be("Before you can delete your account, finish your open order.");
        (await RefusalAsync(seller)).Should().Be("Before you can delete your account, finish your open order.");
    }

    [Fact]
    public async Task Refuses_While_A_Dispute_Is_Open()
    {
        var (_, buyer, orderId) = await OpenOrderAsync();
        (await buyer.PostAsJsonAsync($"/api/orders/{orderId}/pay", new { })).EnsureSuccessStatusCode(); // Mock provider in tests
        (await buyer.PostAsJsonAsync($"/api/disputes/{orderId}", new { reason = "The card arrived with a crease." })).EnsureSuccessStatusCode();

        (await RefusalAsync(buyer)).Should()
            .Be("Before you can delete your account, wait for your open dispute to be resolved and finish your open order.");
    }

    [Fact]
    public async Task Refuses_While_Money_Is_Held_In_The_Wallet()
    {
        var (client, userId) = await factory.SignInNewUserAsync();
        await using (var db = factory.NewDb())
        {
            db.WalletEntries.Add(new WalletEntry { Id = Guid.NewGuid(), UserId = userId, Delta = 970m, Kind = "sale" });
            await db.SaveChangesAsync();
        }

        (await RefusalAsync(client)).Should().Be("Before you can delete your account, withdraw your ₱970 balance.");
    }

    [Fact]
    public async Task Lists_Everything_To_Finish_In_One_Sentence()
    {
        var (client, userId) = await factory.SignInNewUserAsync();
        await using (var db = factory.NewDb())
        {
            db.WalletEntries.Add(new WalletEntry { Id = Guid.NewGuid(), UserId = userId, Delta = 1500m, Kind = "sale" });
            db.PayoutRequests.Add(new PayoutRequest
            {
                Id = Guid.NewGuid(), UserId = userId, Amount = 500m, Method = "gcash", Destination = "09171234567", Status = "pending",
            });
            await db.SaveChangesAsync();
        }

        (await RefusalAsync(client)).Should()
            .Be("Before you can delete your account, wait for your payout to be sent and withdraw your ₱1,000 balance.");
    }

    [Fact]
    public async Task Refuses_While_Winning_A_Live_Auction()
    {
        var (seller, _) = await factory.SignInNewUserAsync();
        var (bidder, bidderId) = await factory.SignInNewUserAsync("Bidder");
        var auction = await TestListings.CreateAsync(seller, format: "auction");
        await using (var db = factory.NewDb())
            await db.Auctions.Where(a => a.ListingId == auction.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(a => a.CurrentBidderId, (Guid?)bidderId));

        (await RefusalAsync(bidder)).Should().Be("Before you can delete your account, wait for the auction you're winning to end.");
    }

    [Fact]
    public async Task Deleting_Anonymizes_The_Account_And_Keeps_Completed_Records()
    {
        // registered directly, so the test holds Lea's refresh token
        var anon = factory.CreateClient();
        var email = $"leaving-{Guid.NewGuid():N}@test.local";
        var auth = await (await anon.PostAsJsonAsync("/api/auth/register", new { email, name = "Lea Santos", password = "Password123" }))
            .DataAsync<ApiFactory.AuthPayload>();
        var lea = factory.CreateClient();
        lea.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.Tokens.AccessToken);
        var leaId = auth.User.Id;

        var (seller, sellerId) = await factory.SignInNewUserAsync("Other Seller");
        var (_, buyerId) = await factory.SignInNewUserAsync("Other Buyer");
        var bought = await TestListings.CreateAsync(seller); // Lea bought this; the sale is complete
        var forSale = await TestListings.CreateAsync(lea);   // Lea's own live listing
        var orderId = Guid.NewGuid();
        await using (var db = factory.NewDb())
        {
            db.Orders.Add(new Order
            {
                Id = orderId, ListingId = bought.Id, BuyerId = leaId, SellerId = sellerId, Price = 1500m,
                Status = OrderStatus.FundsReleased, ShippingAddress = "12 Mabini Street, Barangay 1, Quezon City",
                PaidAt = DateTime.UtcNow.AddDays(-9), DeliveredAt = DateTime.UtcNow.AddDays(-2),
            });
            db.Reviews.Add(new Review { Id = Guid.NewGuid(), OrderId = orderId, ReviewerId = leaId, RevieweeId = sellerId, Rating = 5, Content = "Well packed." });
            db.Offers.Add(new Offer
            {
                Id = Guid.NewGuid(), ListingId = forSale.Id, BuyerId = buyerId, SellerId = leaId, CreatedById = buyerId,
                Amount = 1200m, Status = OfferStatus.Pending, ExpiresAt = DateTime.UtcNow.AddDays(2),
            });
            db.PushDevices.Add(new PushDevice { Id = Guid.NewGuid(), UserId = leaId, Token = $"ExponentPushToken[{Guid.NewGuid():N}]", Platform = "ios" });
            await db.SaveChangesAsync();
        }

        (await lea.DeleteAsync("/api/me")).StatusCode.Should().Be(HttpStatusCode.NoContent);

        // sign-in is disabled
        (await anon.PostAsJsonAsync("/api/auth/login", new { email, password = "Password123" })).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await anon.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = auth.Tokens.RefreshToken })).StatusCode.Should().Be(HttpStatusCode.BadRequest);

        await using var check = factory.NewDb();
        var user = await check.Users.AsNoTracking().SingleAsync(u => u.Id == leaId);
        user.Name.Should().Be("Deleted user");
        user.Email.Should().NotContain("leaving-");
        user.PasswordHash.Should().BeNull();
        user.LockoutEnd.Should().NotBeNull();
        (await check.PushDevices.AnyAsync(d => d.UserId == leaId)).Should().BeFalse();
        (await check.Listings.SingleAsync(l => l.Id == forSale.Id)).Status.Should().Be(ListingStatus.Cancelled);
        (await check.Offers.SingleAsync(o => o.ListingId == forSale.Id)).Status.Should().Be(OfferStatus.Withdrawn);

        // completed records stay for the other party, without Lea's address
        var order = await check.Orders.SingleAsync(o => o.Id == orderId);
        order.Status.Should().Be(OrderStatus.FundsReleased);
        order.ShippingAddress.Should().BeNull();
        (await check.Reviews.AnyAsync(r => r.OrderId == orderId)).Should().BeTrue();
        var page = await (await anon.GetAsync($"/api/sellers/{leaId}")).DataAsync<SellerPageDto>();
        page.Seller.DisplayName.Should().Be("Deleted user");
    }
}
