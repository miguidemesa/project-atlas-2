using Atlas.Application.MarketData;

namespace Atlas.Infrastructure.MarketData;

/// <summary>
/// Default provider used when MarketData:Provider is None — always reports
/// no quote so ingestion pipelines stay runnable (and observable) without
/// external credentials.
/// </summary>
public sealed class UnavailableCardPriceProvider : ICardPriceProvider
{
    public Task<ExternalQuote?> GetLatestQuoteAsync(CardIdentity card, CancellationToken cancellationToken = default)
        => Task.FromResult<ExternalQuote?>(null);
}
