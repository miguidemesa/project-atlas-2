namespace Atlas.Domain.Auctions;

public class Bid
{
    public Guid Id { get; set; }
    public Guid ListingId { get; set; }
    public Guid BidderId { get; set; }
    public decimal Amount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}