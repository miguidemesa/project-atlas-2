namespace Atlas.Application.MarketData;

/// <summary>
/// Config-fixed rate until the PSP/FX phase introduces a live feed.
/// Rates are set server-side only — never from client input.
/// </summary>
public sealed class FixedFxRateProvider(decimal rate) : IFxRateProvider
{
    public Task<decimal> GetUsdToPhpAsync(CancellationToken cancellationToken = default)
    {
        if (rate <= 0)
            throw new InvalidOperationException("FX rate must be positive.");
        return Task.FromResult(rate);
    }
}
