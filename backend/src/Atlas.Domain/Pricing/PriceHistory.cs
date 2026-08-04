namespace Atlas.Domain.Pricing;

public class PriceHistory
{
    public Guid Id { get; set; }
    public string CardIdentityKey { get; set; } = string.Empty;
    public decimal SalePrice { get; set; }
    public DateTime SaleDate { get; set; }
    public string Source { get; set; } = "internal_transaction";
}