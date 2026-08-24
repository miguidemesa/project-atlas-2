using Atlas.Application.MarketData;
using FluentAssertions;
using Microsoft.Extensions.Logging;

namespace Atlas.Tests.Unit.MarketData;

public class MarketDataIngestionServiceTests
{
    private static readonly CardIdentity Card = new("Victor Wembanyama", 2023, "Prizm", "Silver");

    private sealed class StubProvider(ExternalQuote? quote) : ICardPriceProvider
    {
        public Task<ExternalQuote?> GetLatestQuoteAsync(CardIdentity card, CancellationToken cancellationToken = default)
            => Task.FromResult(quote);
    }

    private sealed class RecordingStore : IPriceHistoryStore
    {
        public List<(string Key, decimal Price, DateOnly AsOf, string Source)> Appends { get; } = [];
        public Task AppendAsync(string cardIdentityKey, decimal pricePhp, DateOnly asOf, string source, CancellationToken cancellationToken = default)
        {
            Appends.Add((cardIdentityKey, pricePhp, asOf, source));
            return Task.CompletedTask;
        }
    }

    private static MarketDataIngestionService Build(ICardPriceProvider provider, RecordingStore store, IFxRateProvider? fx = null) =>
        new(provider, fx ?? new FixedFxRateProvider(58.5m), store,
            new StubLogger());

    [Fact]
    public async Task Ingests_UsdQuote_As_Php_With_Provenance()
    {
        var store = new RecordingStore();
        var svc = Build(new StubProvider(new ExternalQuote("pricecharting", "pc-123", RawPriceUsd: 100m, GradedPriceUsd: 450m, AsOf: new DateOnly(2026, 8, 24))), store);

        var result = await svc.IngestAsync(Card);

        result.Status.Should().Be(IngestionStatus.Ingested);
        result.PricePhp.Should().Be(5850m);
        store.Appends.Should().ContainSingle();
        var append = store.Appends[0];
        append.Key.Should().Be("victor wembanyama|2023|prizm|silver");
        append.Source.Should().Be("provider:pricecharting");
        append.Price.Should().Be(5850m);
    }

    [Fact]
    public async Task Rounds_Away_From_Zero_To_Two_Decimals()
    {
        var store = new RecordingStore();
        var svc = Build(new StubProvider(new ExternalQuote("p", "x", 12.345m, null, DateOnly.MinValue)), store);

        var result = await svc.IngestAsync(Card);

        result.PricePhp.Should().Be(722.18m);
    }

    [Fact]
    public async Task Falls_Back_To_Graded_When_Raw_Missing()
    {
        var store = new RecordingStore();
        var svc = Build(new StubProvider(new ExternalQuote("p", "x", null, 50m, DateOnly.MinValue)), store, new FixedFxRateProvider(60m));

        var result = await svc.IngestAsync(Card);

        result.Status.Should().Be(IngestionStatus.Ingested);
        result.PricePhp.Should().Be(3000m);
    }

    [Fact]
    public async Task Reports_NoQuote_When_Provider_Has_Nothing()
    {
        var store = new RecordingStore();
        var svc = Build(new StubProvider(null), store);

        var result = await svc.IngestAsync(Card);

        result.Status.Should().Be(IngestionStatus.NoQuote);
        store.Appends.Should().BeEmpty();
    }

    [Fact]
    public async Task Reports_NoPrice_When_All_Tiers_Zero()
    {
        var store = new RecordingStore();
        var svc = Build(new StubProvider(new ExternalQuote("p", "x", 0m, 0m, DateOnly.MinValue)), store);

        var result = await svc.IngestAsync(Card);

        result.Status.Should().Be(IngestionStatus.NoPricePublished);
        store.Appends.Should().BeEmpty();
    }

    [Fact]
    public async Task Rejects_NonPositive_Fx_Rate()
    {
        var store = new RecordingStore();
        var svc = Build(new StubProvider(new ExternalQuote("p", "x", 10m, null, DateOnly.MinValue)), store, new FixedFxRateProvider(0m));

        var act = async () => await svc.IngestAsync(Card);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }
}

file sealed class StubLogger : Microsoft.Extensions.Logging.ILogger<MarketDataIngestionService>
{
    public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
    public bool IsEnabled(Microsoft.Extensions.Logging.LogLevel logLevel) => false;
    public void Log<TState>(Microsoft.Extensions.Logging.LogLevel logLevel, Microsoft.Extensions.Logging.EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) { }
}
