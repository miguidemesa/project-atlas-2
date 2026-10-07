namespace Atlas.Application.Listings;

public static class ListingTitle
{
    public const int MaxLength = 200;

    /// <summary>
    /// Sports: "2023 Prizm Victor Wembanyama Silver #136".
    /// Every other game: "Charizard ex · 151 199/165 · SIR · Japanese".
    /// </summary>
    public static string Build(CreateListingRequest r)
    {
        string title;
        if (CategoryList.IsSports(r.Category))
        {
            var number = string.IsNullOrWhiteSpace(r.CardNumber) ? null : $"#{r.CardNumber.Trim().TrimStart('#')}";
            title = Join(" ", r.Year?.ToString(), r.Set, r.Player, r.Parallel, number);
        }
        else
        {
            title = Join(" · ", r.Player, Join(" ", r.Set, r.CardNumber), r.Parallel, LanguageName(r.Language));
        }
        return title.Length <= MaxLength ? title : title[..MaxLength].TrimEnd();
    }

    private static string Join(string separator, params string?[] parts) =>
        string.Join(separator, parts.Where(p => !string.IsNullOrWhiteSpace(p)).Select(p => p!.Trim()));

    /// <summary>English is the default, so only other languages appear in the title.</summary>
    private static string? LanguageName(string? code) =>
        code is null or ListingLanguages.Default or "other" ? null : ListingLanguages.Names.GetValueOrDefault(code);
}
