namespace Atlas.Application.MarketData;

public interface IPriceHistoryStore
{
    /// <summary>
    /// Appends one normalized PHP price point with explicit provenance.
    /// Implementations persist into price_history with source = <paramref name="source"/>.
    /// </summary>
    Task AppendAsync(string cardIdentityKey, decimal pricePhp, DateOnly asOf, string source, CancellationToken cancellationToken = default);
}
