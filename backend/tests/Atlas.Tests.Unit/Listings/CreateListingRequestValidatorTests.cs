using Atlas.Application.Listings;
using FluentAssertions;

namespace Atlas.Tests.Unit.Listings;

public class CreateListingRequestValidatorTests
{
    private readonly CreateListingRequestValidator _validator = new();

    private static CreateListingRequest Valid() => new(
        Category: "pokemon", Player: "Charizard ex", Team: null, Year: null, Set: "151", CardNumber: "199/165",
        Language: "en", Parallel: "SIR", Graded: false, GradingCompany: null, GradeValue: null, Condition: "NM",
        Type: "single_card", Format: "fixed", Price: 9800m, EndsInHours: null);

    [Fact]
    public void A_Trading_Card_Needs_No_Team_Or_Year() =>
        _validator.Validate(Valid()).IsValid.Should().BeTrue();

    [Fact]
    public void Legacy_And_Unknown_Categories_Fail()
    {
        _validator.Validate(Valid() with { Category = "nba" }).IsValid.Should().BeFalse();
        _validator.Validate(Valid() with { Category = "funko" }).IsValid.Should().BeFalse();
    }

    [Fact]
    public void Sports_Cards_Need_A_Team_And_A_Year() =>
        _validator.Validate(Valid() with { Category = "basketball" }).Errors
            .Select(e => e.PropertyName).Should().Contain(new[] { "Team", "Year" });

    [Theory]
    [InlineData(1899, false)]
    [InlineData(1909, true)]
    [InlineData(1986, true)]
    public void Vintage_Years_Back_To_1900_Are_Allowed(int year, bool valid) =>
        _validator.Validate(Valid() with { Year = year }).IsValid.Should().Be(valid);

    [Fact]
    public void Next_Year_Is_Allowed_For_Preorders_But_Not_Later()
    {
        var next = DateTime.UtcNow.Year + 1;
        _validator.Validate(Valid() with { Year = next }).IsValid.Should().BeTrue();
        _validator.Validate(Valid() with { Year = next + 1 }).IsValid.Should().BeFalse();
    }

    [Theory]
    [InlineData("CGC")]
    [InlineData("TAG")]
    [InlineData("ACE")]
    public void New_Grading_Companies_Are_Accepted(string company) =>
        _validator.Validate(Valid() with { Graded = true, GradingCompany = company, GradeValue = "9.5", Condition = null })
            .IsValid.Should().BeTrue();

    [Fact]
    public void A_Raw_Single_Needs_A_Condition_Code()
    {
        _validator.Validate(Valid() with { Condition = null }).IsValid.Should().BeFalse();
        _validator.Validate(Valid() with { Condition = "Near Mint" }).IsValid.Should().BeFalse();
    }

    [Fact]
    public void Sealed_Product_Needs_No_Condition() =>
        _validator.Validate(Valid() with { Type = "hobby_box", Condition = null }).IsValid.Should().BeTrue();

    [Fact]
    public void Unknown_Language_Fails() =>
        _validator.Validate(Valid() with { Language = "klingon" }).IsValid.Should().BeFalse();

    [Fact]
    public void Serial_Number_Is_Capped_At_50_Characters()
    {
        _validator.Validate(Valid() with { SerialNumber = new string('1', 50) }).IsValid.Should().BeTrue();
        _validator.Validate(Valid() with { SerialNumber = new string('1', 51) }).IsValid.Should().BeFalse();
    }
}
