namespace Atlas.Application.MarketData;

public enum IngestionStatus
{
    Ingested,
    NoQuote,
    NoPricePublished,
}

public sealed record MarketDataIngestionResult(
    IngestionStatus Status,
    CardIdentity Card,
    decimal? PricePhp = null,
    string? ExternalId = null);
