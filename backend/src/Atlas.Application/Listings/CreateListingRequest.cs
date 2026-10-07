using FluentValidation;

namespace Atlas.Application.Listings;

/// <param name="Player">The player for sports cards, or the card or character name for every other game.</param>
/// <param name="Team">Sports cards only.</param>
public sealed record CreateListingRequest(
    string Category,
    string Player,
    string? Team,
    int? Year,
    string Set,
    string? CardNumber,
    string? Language,
    string? Parallel,
    bool Graded,
    string? GradingCompany,
    string? GradeValue,
    string? Condition,
    string Type,
    string Format,
    decimal Price,
    int? EndsInHours,
    string? Description = null,
    string? SerialNumber = null);

public sealed class CreateListingRequestValidator : AbstractValidator<CreateListingRequest>
{
    public static readonly string[] Graders = ["PSA", "BGS", "CGC", "SGC", "TAG", "ACE"];
    public static readonly string[] Conditions = ["NM", "LP", "MP", "HP", "DMG"];

    public CreateListingRequestValidator()
    {
        RuleFor(x => x.Category).Must(CategoryList.IsValid).WithMessage("Choose a valid category.");
        RuleFor(x => x.Player).NotEmpty().WithMessage("Name the card or player.").MaximumLength(200);

        RuleFor(x => x.Team).NotEmpty().WithMessage("Which team is it?").When(x => CategoryList.IsSports(x.Category));
        RuleFor(x => x.Team).MaximumLength(200);

        RuleFor(x => x.Year).NotNull().WithMessage("Sports cards need a year.").When(x => CategoryList.IsSports(x.Category));
        RuleFor(x => x.Year).InclusiveBetween(1900, DateTime.UtcNow.Year + 1)
            .WithMessage("Year must be between 1900 and next year.").When(x => x.Year is not null);

        RuleFor(x => x.Set).NotEmpty().WithMessage("Which set is it from?").MaximumLength(200);
        RuleFor(x => x.CardNumber).MaximumLength(30);
        RuleFor(x => x.Language).Must(ListingLanguages.IsValid).WithMessage("Choose a valid language.");
        RuleFor(x => x.Parallel).MaximumLength(100);
        RuleFor(x => x.SerialNumber).MaximumLength(50);
        RuleFor(x => x.Description).MaximumLength(2000);

        RuleFor(x => x.Type).Must(t => ListingTypes.TryParse(t, out _)).WithMessage("Choose a valid listing type.");
        RuleFor(x => x.Format).Must(f => f is "fixed" or "auction").WithMessage("Format must be fixed or auction.");
        RuleFor(x => x.EndsInHours).NotNull().InclusiveBetween(1, 720)
            .WithMessage("Auctions run between 1 hour and 30 days.").When(x => x.Format == "auction");
        RuleFor(x => x.EndsInHours).Null().When(x => x.Format == "fixed");

        RuleFor(x => x.Price).GreaterThan(0).LessThanOrEqualTo(10_000_000)
            .PrecisionScale(18, 2, ignoreTrailingZeros: true).WithMessage("Price supports two decimal places.");

        RuleFor(x => x.GradingCompany).Must(c => c is not null && Graders.Contains(c))
            .WithMessage("Grading company must be PSA, BGS, CGC, SGC, TAG or ACE.").When(x => x.Graded);
        RuleFor(x => x.GradeValue).NotEmpty().Matches(@"^(?:10|[1-9](?:\.5)?)$")
            .WithMessage("Grade looks invalid.").When(x => x.Graded);
        RuleFor(x => x.GradeValue).Null().Unless(x => x.Graded);

        RuleFor(x => x.Condition).Must(c => c is not null && Conditions.Contains(c))
            .WithMessage("Pick a condition: NM, LP, MP, HP or DMG.").When(x => !x.Graded && x.Type == "single_card");
        RuleFor(x => x.Condition).Must(c => c is null || Conditions.Contains(c))
            .WithMessage("Pick a condition: NM, LP, MP, HP or DMG.").When(x => x.Graded || x.Type != "single_card");
    }
}
