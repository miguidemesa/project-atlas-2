using Atlas.Application.MarketData;
using Atlas.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Atlas.Infrastructure.MarketData;

/// <summary>
/// Persists ingested price points into price_history with explicit
/// provenance. Scoped because it owns an AtlasDbContext.
/// </summary>
public sealed class EfPriceHistoryStore(AtlasDbContext db) : IPriceHistoryStore
{
    public async Task AppendAsync(string cardIdentityKey, decimal pricePhp, DateOnly asOf, string source, CancellationToken cancellationToken = default)
    {
        var alreadyToday = await db.PriceHistory.AnyAsync(
            h => h.CardIdentityKey == cardIdentityKey && h.SaleDate.Date == asOf.ToDateTime(TimeOnly.MinValue) && h.Source == source,
            cancellationToken);
        if (alreadyToday)
            return;

        db.PriceHistory.Add(new Domain.Pricing.PriceHistory
        {
            Id = Guid.NewGuid(),
            CardIdentityKey = cardIdentityKey,
            SalePrice = pricePhp,
            SaleDate = asOf.ToDateTime(TimeOnly.MinValue),
            Source = source,
        });
        await db.SaveChangesAsync(cancellationToken);
    }
}
