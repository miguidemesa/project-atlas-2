namespace Atlas.Application.MarketData;

public interface IFxRateProvider
{
    /// <summary>Current USD → PHP multiplier, always greater than zero.</summary>
    Task<decimal> GetUsdToPhpAsync(CancellationToken cancellationToken = default);
}
