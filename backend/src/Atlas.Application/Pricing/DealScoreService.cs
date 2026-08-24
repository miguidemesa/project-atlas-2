namespace Atlas.Application.Pricing;

public enum DealRating
{
    GreatDeal,
    Fair,
    AboveMarket,
}

public sealed record DealScoreResult(
    DealRating Rating,
    decimal MedianPricePhp,
    decimal DeltaPct,
    int SampleCount);

/// <summary>
/// Compares an asking price against recent sale history. Pure function so it
/// can run anywhere (API response, ingestion pipeline, backfill jobs).
/// Mirrors the frontend's lib/deal-score.ts until the API serves scores.
/// </summary>
public static class DealScoreService
{
    public const int MinSamples = 3;

    /// <param name="recentSalePricesPhp">Most recent first or last — order does not matter.</param>
    public static DealScoreResult? Evaluate(decimal askingPricePhp, IReadOnlyCollection<decimal> recentSalePricesPhp)
    {
        if (recentSalePricesPhp.Count < MinSamples || askingPricePhp <= 0)
            return null;

        var sorted = recentSalePricesPhp.OrderBy(p => p).ToArray();
        var mid = sorted.Length / 2;
        var median = sorted.Length % 2 == 1
            ? sorted[mid]
            : (sorted[mid - 1] + sorted[mid]) / 2m;

        if (median <= 0)
            return null;

        var deltaPct = Math.Round((askingPricePhp - median) / median * 100m, 1, MidpointRounding.AwayFromZero);
        var rating = askingPricePhp <= median * 0.92m
            ? DealRating.GreatDeal
            : askingPricePhp <= median * 1.08m
                ? DealRating.Fair
                : DealRating.AboveMarket;

        return new DealScoreResult(rating, Math.Round(median, 2), deltaPct, sorted.Length);
    }
}
