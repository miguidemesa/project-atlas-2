namespace Atlas.Domain.Rewards;

public class PointsLedger
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public int Delta { get; set; } // + earn, − redeem
    public string Kind { get; set; } = "earn"; // earn_sale | earn_purchase | earn_review | redeem
    public Guid? OrderId { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
