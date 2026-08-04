namespace Atlas.Domain.Sellers;

public class SellerProfile
{
    public Guid UserId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public decimal RatingAvg { get; set; }
    public int RatingCount { get; set; }
    public int SoldCount { get; set; }
    public DateTime JoinedDate { get; set; } = DateTime.UtcNow;
    public bool VerificationBadge { get; set; }
}