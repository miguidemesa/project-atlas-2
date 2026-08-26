using Atlas.Application.Rewards;
using Atlas.Domain.Listings;
using Microsoft.Extensions.Configuration;
using Atlas.Domain.Orders;
using Atlas.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Atlas.Infrastructure.Orders;

public sealed record OrderDto(
    Guid Id,
    Guid ListingId,
    string ListingTitle,
    string? ListingImageUrl,
    decimal Price,
    string Status,
    string Role,
    string? ShippingAddress,
    string? TrackingNumber,
    DateTime CreatedAt,
    bool Reviewed,
    DateTime? PaidAt,
    DateTime? ShippedAt,
    DateTime? DeliveredAt);

public sealed record CreateOrderRequest(Guid ListingId, string ShippingAddress);

public sealed class OrderConflictException(string message) : Exception(message);
public sealed class OrderForbiddenException : Exception;

public interface IOrderService
{
    Task<OrderDto> CreateAsync(Guid buyerId, CreateOrderRequest request, CancellationToken ct = default);

    /// <summary>Validates a pending order for payment and stores the PSP session reference.</summary>
    Task<(Guid OrderId, decimal Price)> BeginPaymentAsync(Guid orderId, Guid actorId, string? shippingAddress, string sessionId, CancellationToken ct = default);

    /// <summary>
    /// Transitions PendingPayment → PaidAwaitingShipment and pulls the listing
    /// off the market. Idempotent; only called with PSP-verified truth
    /// (status poll or signed webhook) per domain rule 5.
    /// </summary>
    Task MarkPaidAsync(Guid orderId, CancellationToken ct = default);
    Task MarkPaidBySessionAsync(string sessionId, CancellationToken ct = default);

    Task<OrderDto> ShipAsync(Guid orderId, Guid actorId, string trackingNumber, CancellationToken ct = default);
    Task<OrderDto> ConfirmDeliveryAsync(Guid orderId, Guid actorId, CancellationToken ct = default);
    Task<IReadOnlyList<OrderDto>> MineAsync(Guid userId, CancellationToken ct = default);
}

public sealed class OrderService(AtlasDbContext db, IConfiguration config) : IOrderService
{
    public async Task<OrderDto> CreateAsync(Guid buyerId, CreateOrderRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.ShippingAddress) || request.ShippingAddress.Trim().Length < 20)
            throw new ArgumentException("Enter the complete delivery address (at least 20 characters).");

        var listing = await db.Listings.FirstOrDefaultAsync(l => l.Id == request.ListingId, ct)
            ?? throw new KeyNotFoundException("Listing not found.");

        if (listing.SellerId == buyerId)
            throw new OrderConflictException("You cannot buy your own listing.");
        if (listing.Status != ListingStatus.Active)
            throw new OrderConflictException("This listing is no longer available.");
        if (listing.ListingFormat != ListingFormat.FixedPrice)
            throw new OrderConflictException("Only fixed-price listings can be bought directly.");
        if (await db.Orders.AnyAsync(o => o.ListingId == listing.Id
                && o.Status != OrderStatus.Cancelled && o.Status != OrderStatus.Refunded, ct))
            throw new OrderConflictException("Someone is already checking out this card. Try again if it frees up.");

        var order = NewOrder(buyerId, listing, request.ShippingAddress.Trim());
        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);

        return await ToDtoAsync(order, "buyer", buyerId, ct);
    }

    public async Task<(Guid OrderId, decimal Price)> BeginPaymentAsync(Guid orderId, Guid actorId, string? shippingAddress, string sessionId, CancellationToken ct = default)
    {
        var order = await GetOrderAsync(orderId, ct);
        if (order.BuyerId != actorId) throw new OrderForbiddenException();
        if (order.Status != OrderStatus.PendingPayment)
            throw new OrderConflictException("This order can't be paid from its current status.");

        if (string.IsNullOrWhiteSpace(order.ShippingAddress))
        {
            if (string.IsNullOrWhiteSpace(shippingAddress) || shippingAddress.Trim().Length < 20)
                throw new ArgumentException("Enter the complete delivery address (at least 20 characters).");
            order.ShippingAddress = shippingAddress.Trim();
        }

        order.PaymentSessionId = sessionId;
        order.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return (order.Id, order.Price);
    }

    public async Task MarkPaidAsync(Guid orderId, CancellationToken ct = default)
    {
        var order = await GetOrderAsync(orderId, ct);
        if (order.Status is OrderStatus.PaidAwaitingShipment or OrderStatus.Shipped or OrderStatus.FundsReleased)
            return; // idempotent — webhook retries and polls land here safely

        if (order.Status != OrderStatus.PendingPayment)
            throw new OrderConflictException($"Unexpected paid transition from '{order.Status}'.");

        ApplyPaid(order);
        await db.SaveChangesAsync(ct);
    }

    public async Task MarkPaidBySessionAsync(string sessionId, CancellationToken ct = default)
    {
        var orderId = await db.Orders.AsNoTracking()
            .Where(o => o.PaymentSessionId == sessionId)
            .Select(o => (Guid?)o.Id)
            .FirstOrDefaultAsync(ct);
        if (orderId is null)
            throw new KeyNotFoundException($"No order for session {sessionId}.");
        await MarkPaidAsync(orderId.Value, ct);
    }

    public async Task<OrderDto> ShipAsync(Guid orderId, Guid actorId, string trackingNumber, CancellationToken ct = default)
    {
        var order = await GetOrderAsync(orderId, ct);
        if (order.SellerId != actorId) throw new OrderForbiddenException();
        if (order.Status != OrderStatus.PaidAwaitingShipment)
            throw new OrderConflictException("Only paid orders awaiting shipment can be shipped.");

        order.Status = OrderStatus.Shipped;
        order.TrackingNumber = string.IsNullOrWhiteSpace(trackingNumber) ? null : trackingNumber.Trim();
        order.ShippedAt = DateTime.UtcNow;
        order.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return await ToDtoAsync(order, "seller", actorId, ct);
    }

    public async Task<OrderDto> ConfirmDeliveryAsync(Guid orderId, Guid actorId, CancellationToken ct = default)
    {
        var order = await GetOrderAsync(orderId, ct);
        if (order.BuyerId != actorId) throw new OrderForbiddenException();
        if (order.Status != OrderStatus.Shipped)
            throw new OrderConflictException("Confirm delivery once the order has shipped.");

        order.Status = OrderStatus.FundsReleased; // escrow releases to the seller
        order.DeliveredAt = DateTime.UtcNow;
        order.UpdatedAt = DateTime.UtcNow;

        // escrow releases to the seller wallet (credit-only, no cash-out)
        db.WalletEntries.Add(new Domain.Wallet.WalletEntry
        {
            Id = Guid.NewGuid(), UserId = order.SellerId,
            Delta = order.Price, Kind = "sale", OrderId = order.Id,
            CreatedAt = DateTime.UtcNow,
        });

        // loyalty: reward both sides for a completed, escrow-verified trade
        var expiry = DateTime.UtcNow.AddDays(365);
        db.PointsLedger.AddRange(
            new Domain.Rewards.PointsLedger { Id = Guid.NewGuid(), UserId = order.SellerId,
                Delta = RewardsMath.AwardForSale(order.Price), Kind = "earn_sale",
                OrderId = order.Id, ExpiresAt = expiry },
            new Domain.Rewards.PointsLedger { Id = Guid.NewGuid(), UserId = order.BuyerId,
                Delta = RewardsMath.AwardForPurchase(order.Price), Kind = "earn_purchase",
                OrderId = order.Id, ExpiresAt = expiry });
        await db.SaveChangesAsync(ct);
        return await ToDtoAsync(order, "buyer", actorId, ct);
    }

    public async Task<IReadOnlyList<OrderDto>> MineAsync(Guid userId, CancellationToken ct = default)
    {
        var rows = await db.Orders.AsNoTracking()
            .Join(db.Listings.AsNoTracking(),
                o => o.ListingId,
                l => l.Id,
                (o, l) => new { Order = o, Title = l.Title, ImageUrl = l.ImageUrl })
            .GroupJoin(db.Reviews.AsNoTracking(),
                x => new { Order = x.Order.Id, Reviewer = userId },
                r => new { Order = r.OrderId, Reviewer = r.ReviewerId },
                (x, rs) => new { x.Order, x.Title, x.ImageUrl, Reviewed = rs.Any() })
            .Where(x => x.Order.BuyerId == userId || x.Order.SellerId == userId)
            .OrderByDescending(x => x.Order.CreatedAt)
            .ToListAsync(ct);

        return rows.Select(x =>
        {
            var role = x.Order.BuyerId == userId ? "buyer" : "seller";
            return new OrderDto(
                x.Order.Id,
                x.Order.ListingId,
                x.Title,
                x.ImageUrl,
                x.Order.Price,
                ToApiStatus(x.Order.Status),
                role,
                x.Order.ShippingAddress,
                x.Order.TrackingNumber,
                x.Order.CreatedAt,
                x.Reviewed,
                x.Order.PaidAt,
                x.Order.ShippedAt,
                x.Order.DeliveredAt);
        }).ToList();
    }

    // ---- helpers ----

    private static Domain.Orders.Order NewOrder(Guid buyerId, Listing listing, string address) =>
        new()
        {
            Id = Guid.NewGuid(),
            BuyerId = buyerId,
            SellerId = listing.SellerId,
            ListingId = listing.Id,
            Price = listing.Price,
            Status = OrderStatus.PendingPayment,
            ShippingAddress = address,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

    private void ApplyPaid(Domain.Orders.Order order)
    {
        order.Status = OrderStatus.PaidAwaitingShipment;
        order.PaidAt = DateTime.UtcNow;
        order.UpdatedAt = DateTime.UtcNow;

        // payment pulls the card off the open market immediately
        var listing = db.Listings.Local.FirstOrDefault(l => l.Id == order.ListingId)
            ?? db.Listings.First(l => l.Id == order.ListingId);
        if (listing.Status == ListingStatus.Active)
        {
            listing.Status = ListingStatus.Sold;
            listing.UpdatedAt = DateTime.UtcNow;
        }
    }

    private async Task<Domain.Orders.Order> GetOrderAsync(Guid orderId, CancellationToken ct) =>
        await db.Orders.FirstAsync(o => o.Id == orderId, ct);

    private async Task<OrderDto> ToDtoAsync(Domain.Orders.Order o, string role, Guid actorId, CancellationToken ct)
    {
        var listing = await db.Listings.AsNoTracking()
            .Where(l => l.Id == o.ListingId)
            .Select(l => new { l.Title, l.ImageUrl })
            .FirstAsync(ct);

        return new OrderDto(
            o.Id,
            o.ListingId,
            listing.Title,
            listing.ImageUrl,
            o.Price,
            ToApiStatus(o.Status),
            role,
            o.ShippingAddress,
            o.TrackingNumber,
            o.CreatedAt,
            await db.Reviews.AnyAsync(r => r.OrderId == o.Id && r.ReviewerId == actorId, ct),
            o.PaidAt,
            o.ShippedAt,
            o.DeliveredAt);
    }

    private static string ToApiStatus(OrderStatus status) => status switch
    {
        OrderStatus.PendingPayment => "pending_payment",
        OrderStatus.PaidAwaitingShipment => "paid_awaiting_shipment",
        OrderStatus.Shipped => "shipped",
        OrderStatus.DeliveredConfirmed => "delivered_confirmed",
        OrderStatus.FundsReleased => "funds_released",
        OrderStatus.Disputed => "disputed",
        OrderStatus.Cancelled => "cancelled",
        _ => "refunded",
    };
}
