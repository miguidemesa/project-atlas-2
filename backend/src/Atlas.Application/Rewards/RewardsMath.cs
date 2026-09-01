namespace Atlas.Application.Rewards;

/// <summary>
/// Pure loyalty math. Rates are config-driven at the call sites; this class
/// owns the conversion + cap rules so they stay identical everywhere.
/// </summary>
public static class RewardsMath
{
    public const decimal SalePointsPerPeso = 0.05m;     // ₱20 → 1 pt
    public const decimal PurchasePointsPerPeso = 0.025m; // ₱40 → 1 pt
    public const int ReviewBonus = 25;
    public const decimal PesosPerPoint = 0.25m;          // 100 pts ≈ ₱25
    public const decimal MaxOrderDiscountRatio = 0.20m;  // redeem caps at 20% of order

    public static int AwardForSale(decimal pricePhp) => (int)(pricePhp * SalePointsPerPeso);
    public static int AwardForPurchase(decimal pricePhp) => (int)(pricePhp * PurchasePointsPerPeso);

    /// <summary>Max peso discount a balance can buy on a given order.</summary>
    public static int MaxRedeemableDiscount(int balance, decimal orderPrice) =>
        (int)Math.Min(
            Math.Floor(balance * PesosPerPoint),
            Math.Floor(orderPrice * MaxOrderDiscountRatio));

    /// <summary>Points consumed for a given peso discount.</summary>
    public static int PointsForDiscount(int discountPeso) =>
        (int)Math.Ceiling(discountPeso / PesosPerPoint);
}
