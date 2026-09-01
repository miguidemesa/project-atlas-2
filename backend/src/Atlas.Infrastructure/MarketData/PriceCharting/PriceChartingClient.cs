using System.Net.Http.Json;
using System.Text.Json;
using Atlas.Application.MarketData;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Atlas.Infrastructure.MarketData.PriceCharting;

/// <summary>
/// Adapter for the PriceCharting product API. Prices are returned in USD
/// cents; this client normalizes them to dollars and lets the ingestion
/// service own FX conversion. Field names are parsed tolerantly — verify
/// against live responses before relying on graded tiers.
/// </summary>
public sealed class PriceChartingClient(
    HttpClient http,
    IOptions<PriceChartingOptions> options,
    ILogger<PriceChartingClient> logger) : ICardPriceProvider
{
    private static string BuildQuery(CardIdentity card) =>
        $"{card.Year} {card.Set} {(card.Parallel ?? "")} {card.Player}".Trim();

    public async Task<ExternalQuote?> GetLatestQuoteAsync(CardIdentity card, CancellationToken cancellationToken = default)
    {
        var opts = options.Value;
        if (string.IsNullOrWhiteSpace(opts.ApiKey))
            return null;

        var url = $"{opts.BaseUrl.TrimEnd('/')}/product?t={Uri.EscapeDataString(opts.ApiKey)}&q={Uri.EscapeDataString(BuildQuery(card))}";

        using var response = await http.GetAsync(url, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("PriceCharting returned {Status} for {Card}", (int)response.StatusCode, card.ToString());
            return null;
        }

        using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
        var root = doc.RootElement;

        if (root.ValueKind != JsonValueKind.Object || !root.TryGetProperty("id", out _))
            return null;

        return new ExternalQuote(
            ProviderName: "pricecharting",
            ExternalId: root.GetProperty("id").GetString() ?? "",
            RawPriceUsd: CentsToUsd(root, "loose-price"),
            GradedPriceUsd: CentsToUsd(root, "graded-price") ?? CentsToUsd(root, "psa-9-price"),
            AsOf: DateOnly.FromDateTime(DateTime.UtcNow));
    }

    private static decimal? CentsToUsd(JsonElement root, string field) =>
        root.TryGetProperty(field, out var el)
        && el.TryGetInt64(out var cents)
        && cents > 0
            ? cents / 100m
            : null;
}
