using Atlas.Application.Rewards;
using FluentAssertions;

namespace Atlas.Tests.Unit.Rewards;

public class RewardsMathTests
{
    [Theory]
    [InlineData(8500, 425)]   // ₱8,500 sale → 425 pts
    [InlineData(100, 5)]
    [InlineData(19, 0)]       // floors, never rounds up
    public void Sale_Award_Floors_Per_Peso(decimal price, int expected) =>
        RewardsMath.AwardForSale(price).Should().Be(expected);

    [Fact]
    public void Purchase_Award_Is_Half_The_Sale_Rate() =>
        RewardsMath.AwardForPurchase(8000).Should().Be(200);

    [Fact]
    public void Redemption_Caps_At_Twenty_Percent_Of_Order()
    {
        // balance huge → order cap wins: 20% of ₱10,000 = ₱2,000
        RewardsMath.MaxRedeemableDiscount(1_000_000, 10000m).Should().Be(2000);
        // balance small → balance wins: 400 pts × ₱0.25 = ₱100
        RewardsMath.MaxRedeemableDiscount(400, 10000m).Should().Be(100);
    }

    [Fact]
    public void Points_Cost_Rounds_Up_So_Discount_Never_Exceeds_Balance_Value()
    {
        RewardsMath.PointsForDiscount(100).Should().Be(400);   // exact
        RewardsMath.PointsForDiscount(101).Should().Be(404);   // ceiling
    }
}
