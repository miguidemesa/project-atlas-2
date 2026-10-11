using Atlas.Application.Listings;
using FluentAssertions;

namespace Atlas.Tests.Unit;

public class CardKeyTests
{
    [Fact]
    public void Ignores_Case_And_Spacing() =>
        CardKey.For("pokemon", "  Charizard  ex ", "Obsidian Flames", "125").Should().Be(CardKey.For("pokemon", "charizard ex", "OBSIDIAN  FLAMES", "125"));

    [Fact]
    public void Different_Sets_Or_Numbers_Are_Different_Cards()
    {
        var a = CardKey.For("basketball", "Victor Wembanyama", "Prizm", "136");
        CardKey.For("basketball", "Victor Wembanyama", "Select", "136").Should().NotBe(a);
        CardKey.For("basketball", "Victor Wembanyama", "Prizm", "250").Should().NotBe(a);
    }

    [Fact]
    public void A_Missing_Number_Only_Matches_A_Missing_Number() =>
        CardKey.For("lorcana", "Stitch", "The First Chapter", null).Should().NotBe(CardKey.For("lorcana", "Stitch", "The First Chapter", "21"));

    [Fact]
    public void Parses_Back_Into_Its_Parts()
    {
        CardKey.TryParse(CardKey.For("one_piece", "Nami", "Awakening", "OP02-036"), out var p).Should().BeTrue();
        p.Should().Be(("one_piece", "nami", "awakening", "op02-036"));
        CardKey.TryParse("not a key", out _).Should().BeFalse();
    }
}
