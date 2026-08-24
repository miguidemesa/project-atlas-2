namespace Atlas.Application.MarketData;

/// <summary>Abstraction over external market-data providers (PriceCharting, eBay sold, …).</summary>
public interface ICardPriceProvider
{
    /// <summary>
    /// Latest published quote for the card, or null when the provider has no match.
    /// Note: most providers publish current prices only — history is built by
    /// ingesting snapshots on a schedule, not by fetching a series.
    /// </summary>
    Task<ExternalQuote?> GetLatestQuoteAsync(CardIdentity card, CancellationToken cancellationToken = default);
}
