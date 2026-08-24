namespace Atlas.Infrastructure.MarketData.PriceCharting;

public sealed class PriceChartingOptions
{
    public const string SectionName = "MarketData:PriceCharting";

    public string ApiKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://www.pricecharting.com/api";
    public int TimeoutSeconds { get; set; } = 10;
}
