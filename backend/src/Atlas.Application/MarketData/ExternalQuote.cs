namespace Atlas.Application.MarketData;

/// <summary>A normalized snapshot quote returned by an external provider.</summary>
public sealed record ExternalQuote(
    string ProviderName,
    string ExternalId,
    decimal? RawPriceUsd,
    decimal? GradedPriceUsd,
    DateOnly AsOf);
