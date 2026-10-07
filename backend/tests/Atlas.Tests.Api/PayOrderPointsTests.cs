using System.Net.Http.Json;
using Atlas.Domain.Orders;
using Atlas.Domain.Rewards;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace Atlas.Tests.Api;

[Collection(ApiCollection.Name)]
public class PayOrderPointsTests(ApiFactory factory)
{
    private sealed record OrderCreated(Guid Id);

    [Fact]
    public async Task Paying_Twice_With_Points_Redeems_Them_Once()
    {
        var (seller, _) = await factory.SignInNewUserAsync();
        var listing = await TestListings.CreateAsync(seller, category: "digimon", price: 2000m);
        var (buyer, buyerId) = await factory.SignInNewUserAsync("Buyer");
        await using (var db = factory.NewDb())
        {
            db.PointsLedger.Add(new PointsLedger { Id = Guid.NewGuid(), UserId = buyerId, Delta = 1000, Kind = "earn_review" });
            await db.SaveChangesAsync();
        }
        var order = await (await buyer.PostAsJsonAsync("/api/orders",
                new { listingId = listing.Id, shippingAddress = "123 Test Street, Barangay Test, Quezon City" }))
            .DataAsync<OrderCreated>();

        (await buyer.PostAsJsonAsync($"/api/orders/{order.Id}/pay", new { usePoints = true })).EnsureSuccessStatusCode();
        int Balance(Atlas.Infrastructure.Persistence.AtlasDbContext d) =>
            d.PointsLedger.Where(p => p.UserId == buyerId && p.Kind != "earn_purchase").Sum(p => p.Delta);
        int after1;
        await using (var db = factory.NewDb())
        {
            after1 = Balance(db);
            // Simulate an abandoned PayMongo checkout: the order is still awaiting payment.
            await db.Orders.Where(o => o.Id == order.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(o => o.Status, OrderStatus.PendingPayment));
        }

        (await buyer.PostAsJsonAsync($"/api/orders/{order.Id}/pay", new { usePoints = true })).EnsureSuccessStatusCode();

        await using var check = factory.NewDb();
        check.PointsLedger.Count(p => p.OrderId == order.Id && p.Kind == "redeem").Should().Be(1);
        Balance(check).Should().Be(after1);
    }
}
