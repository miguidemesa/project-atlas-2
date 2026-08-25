namespace Atlas.Domain.Offers;

public class Offer
{
    public Guid Id { get; set; }
    public Guid ListingId { get; set; }
    public Guid BuyerId { get; set; }
    public Guid SellerId { get; set; }
    public Guid CreatedById { get; set; }
    public decimal Amount { get; set; }
    public OfferStatus Status { get; set; } = OfferStatus.Pending;
    public Guid? CounterToId { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RespondedAt { get; set; }
}

public enum OfferStatus
{
    Pending,
    Accepted,
    Countered,
    Declined,
    Expired,
    Withdrawn,
}
