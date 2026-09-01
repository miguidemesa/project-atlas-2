using Microsoft.Extensions.Logging;

namespace Atlas.Application.MarketData;

/// <summary>
/// Pulls a current quote from an external provider, converts USD to PHP
/// server-side (rule 9: money is PHP), and appends it to price history with
/// explicit provenance. Each run adds one point — charts accumulate over time.
/// </summary>
public sealed class MarketDataIngestionService(
    ICardPriceProvider provider,
    IFxRateProvider fxRateProvider,
    IPriceHistoryStore store,
    ILogger<MarketDataIngestionService> logger)
{
    public async Task<MarketDataIngestionResult> IngestAsync(CardIdentity card, CancellationToken cancellationToken = default)
    {
        var quote = await provider.GetLatestQuoteAsync(card, cancellationToken);
        if (quote is null)
            return new MarketDataIngestionResult(IngestionStatus.NoQuote, card);

        var usd = quote.RawPriceUsd ?? quote.GradedPriceUsd;
        if (usd is not { } amount || amount <= 0)
            return new MarketDataIngestionResult(IngestionStatus.NoPricePublished, card, ExternalId: quote.ExternalId);

        var rate = await fxRateProvider.GetUsdToPhpAsync(cancellationToken);
        var php = Math.Round(amount * rate, 2, MidpointRounding.AwayFromZero);

        await store.AppendAsync(
            card.ToKey(),
            php,
            quote.AsOf,
            $"provider:{quote.ProviderName.ToLowerInvariant()}",
            cancellationToken);

        logger.LogInformation("Ingested {Card} at ₱{Price} from {Provider} ({ExternalId})",
            card.ToString(), php, quote.ProviderName, quote.ExternalId);

        return new MarketDataIngestionResult(IngestionStatus.Ingested, card, php, quote.ExternalId);
    }
}
