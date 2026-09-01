namespace Atlas.Domain.Wallet;

/// <summary>Credit-only peso wallet: sale credits, refunds, payouts.</summary>
public class WalletEntry
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public decimal Delta { get; set; } // + credit, − debit
    public string Kind { get; set; } = "sale"; // sale | refund | payout | purchase
    public Guid? OrderId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class PayoutRequest
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public decimal Amount { get; set; }
    public string Method { get; set; } = "gcash"; // gcash | bank
    public string Destination { get; set; } = string.Empty;
    public string Status { get; set; } = "pending"; // pending | paid | rejected
    public string? AdminNote { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
}
