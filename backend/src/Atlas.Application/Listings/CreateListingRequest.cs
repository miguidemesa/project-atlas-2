using FluentValidation;

namespace Atlas.Application.Listings;

public sealed record CreateListingRequest(
    string Category,
    string Player,
    string Team,
    int Year,
    string Set,
    string? Parallel,
    bool Graded,
    string? GradingCompany,
    string? GradeValue,
    string? Condition,
    string Type,
    string Format,
    decimal Price,
    int? EndsInHours);

public sealed class CreateListingRequestValidator : AbstractValidator<CreateListingRequest>
{
    private static readonly HashSet<string> Categories = ["nba", "pokemon", "one_piece", "disney"];
    private static readonly HashSet<string> Types = ["single_card", "lot", "hobby_box", "accessory"];
    private static readonly HashSet<string> Companies = ["PSA", "BGS", "SGC"];

    public CreateListingRequestValidator()
    {
        RuleFor(x => x.Category).Must(c => Categories.Contains(c)).WithMessage("Choose a valid category.");
        RuleFor(x => x.Player).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Team).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Year).InclusiveBetween(1996, DateTime.UtcNow.Year);
        RuleFor(x => x.Set).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Parallel).MaximumLength(100);
        RuleFor(x => x.Condition).MaximumLength(50);

        RuleFor(x => x.Type).Must(t => Types.Contains(t)).WithMessage("Choose a valid listing type.");

        RuleFor(x => x.Format).Must(f => f is "fixed" or "auction").WithMessage("Format must be fixed or auction.");
        RuleFor(x => x.EndsInHours).NotNull()
            .When(x => x.Format == "auction")
            .InclusiveBetween(1, 720).WithMessage("Auctions run between 1 hour and 30 days.");
        RuleFor(x => x.EndsInHours).Null().When(x => x.Format == "fixed");

        RuleFor(x => x.Price).GreaterThan(0).LessThanOrEqualTo(10_000_000)
            .PrecisionScale(18, 2, ignoreTrailingZeros: true)
            .WithMessage("Price supports two decimal places.");

        RuleFor(x => x.GradingCompany).NotEmpty()
            .When(x => x.Graded).WithMessage("Which company graded it?")
            .Must(c => c is null || Companies.Contains(c)).WithMessage("Grading company must be PSA, BGS or SGC.");
        RuleFor(x => x.GradeValue).Matches(@"^(?:10|[1-9](?:\.5)?)$")
            .When(x => x.Graded).WithMessage("Grade looks invalid.");

        RuleFor(x => x.GradeValue).Null().Unless(x => x.Graded);
    }
}
