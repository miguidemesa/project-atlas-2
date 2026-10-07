using Atlas.Domain.Listings;

namespace Atlas.Application.Listings;

/// <summary>The one place API listing-type names map to <see cref="ListingType"/>.</summary>
public static class ListingTypes
{
    private static readonly (string Name, ListingType Type)[] All =
    [
        ("single_card", ListingType.SingleCard),
        ("lot", ListingType.Lot),
        ("hobby_box", ListingType.HobbyBox),
        ("accessory", ListingType.Accessory),
    ];

    public static IReadOnlyList<string> Names { get; } = All.Select(t => t.Name).ToArray();

    public static bool TryParse(string? name, out ListingType type)
    {
        foreach (var (n, t) in All)
            if (n == name) { type = t; return true; }
        type = default;
        return false;
    }

    public static string ToName(ListingType type) => All.First(t => t.Type == type).Name;
}
