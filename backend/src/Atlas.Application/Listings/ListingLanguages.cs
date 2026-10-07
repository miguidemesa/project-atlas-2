namespace Atlas.Application.Listings;

/// <summary>The one server-side language list: code to display name.</summary>
public static class ListingLanguages
{
    public const string Default = "en";

    public static IReadOnlyDictionary<string, string> Names { get; } = new Dictionary<string, string>
    {
        ["en"] = "English", ["ja"] = "Japanese", ["ko"] = "Korean", ["zh"] = "Chinese", ["fr"] = "French",
        ["de"] = "German", ["it"] = "Italian", ["es"] = "Spanish", ["pt"] = "Portuguese", ["id"] = "Indonesian",
        ["th"] = "Thai", ["other"] = "Other",
    };

    public static bool IsValid(string? code) => code is null || Names.ContainsKey(code);
}
