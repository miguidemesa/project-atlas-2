namespace Atlas.Domain.Auctions;

public class Auction
{
    public Guid ListingId { get; set; }
    public decimal StartPrice { get; set; }
    public decimal? CurrentBid { get; set; }
    public Guid? CurrentBidderId { get; set; }
    public DateTime EndTime { get; set; }
    public int AutoExtendMinutes { get; set; } = 5;
    public AuctionStatus Status { get; set; } = AuctionStatus.Pending;
}