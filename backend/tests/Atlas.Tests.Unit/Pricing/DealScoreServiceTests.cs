using Atlas.Application.Pricing;
using FluentAssertions;

namespace Atlas.Tests.Unit.Pricing;

public class DealScoreServiceTests
{
    private static readonly decimal[] History = [10000m, 9800m, 10200m, 10100m, 9900m];

    [Fact]
    public void Great_Deal_When_Asking_Well_Below_Median()
    {
        var result = DealScoreService.Evaluate(8800m, History); // median 10_000 → -12%

        result.Should().NotBeNull();
        result!.Rating.Should().Be(DealRating.GreatDeal);
        result.MedianPricePhp.Should().Be(10000m);
        result.DeltaPct.Should().Be(-12.0m);
        result.SampleCount.Should().Be(5);
    }

    [Fact]
    public void Fair_Within_Eight_Percent_Band()
    {
        var result = DealScoreService.Evaluate(10400m, History); // +4%
        result!.Rating.Should().Be(DealRating.Fair);

        var edge = DealScoreService.Evaluate(10800m, History); // exactly +8% boundary
        edge!.Rating.Should().Be(DealRating.Fair);
    }

    [Fact]
    public void Above_Market_Past_Eight_Percent()
    {
        var result = DealScoreService.Evaluate(11500m, History); // +15%
        result!.Rating.Should().Be(DealRating.AboveMarket);
        result.DeltaPct.Should().Be(15.0m);
    }

    [Fact]
    public void Even_Count_Median_Averages_Middle_Pair()
    {
        var result = DealScoreService.Evaluate(10000m, new decimal[] { 9000m, 9500m, 10500m, 11000m });
        result!.MedianPricePhp.Should().Be(10000m);
        result.Rating.Should().Be(DealRating.Fair);
    }

    [Fact]
    public void Returns_Null_When_Insufficient_Samples()
    {
        DealScoreService.Evaluate(10000m, new decimal[] { 9500m, 10500m }).Should().BeNull();
    }

    [Fact]
    public void Returns_Null_For_NonPositive_Price()
    {
        DealScoreService.Evaluate(0m, History).Should().BeNull();
        DealScoreService.Evaluate(-5m, History).Should().BeNull();
    }
}
