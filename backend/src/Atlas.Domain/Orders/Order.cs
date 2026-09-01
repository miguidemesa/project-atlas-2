using Atlas.Domain.Listings;

namespace Atlas.Domain.Orders;

public class Order
{

    public Guid Id { get; set; }
    public Guid BuyerId { get; set; }
    public Guid SellerId { get; set; }
    public Guid ListingId { get; set; }
    public decimal Price { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.PendingPayment;
    public string? ShippingAddress { get; set; }
    public string? TrackingNumber { get; set; }
    public string? PaymentSessionId { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime? ShippedAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}