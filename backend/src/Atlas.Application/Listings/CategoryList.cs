using System.Text.RegularExpressions;

namespace Atlas.Application.Listings;

/// <summary>
/// The one list of games and sports Atlas supports. Validation, search parsing
/// and GET /api/categories all read it, and the frontend fetches it.
/// Adding a game = one line here.
/// </summary>
public static class CategoryList
{
    public const string Tcg = "tcg";
    public const string Sports = "sports";
    public const string NonSport = "nonsport";

    public static readonly IReadOnlyList<CategoryInfo> All =
    [
        new("pokemon", "Pokémon", Tcg, 95, ["pokemon", "pokémon", "ptcg", "pkmn"]),
        new("magic", "Magic: The Gathering", Tcg, 35, ["magic the gathering", "mtg"]),
        new("yugioh", "Yu-Gi-Oh!", Tcg, 330, ["yu-gi-oh", "yugioh", "ygo"]),
        new("one_piece", "One Piece", Tcg, 25, ["one piece", "optcg"]),
        new("lorcana", "Disney Lorcana", Tcg, 285, ["disney lorcana", "lorcana"]),
        new("dragon_ball", "Dragon Ball Super", Tcg, 60, ["dragon ball", "fusion world", "dbs"]),
        new("digimon", "Digimon", Tcg, 230, ["digimon"]),
        new("flesh_and_blood", "Flesh and Blood", Tcg, 15, ["flesh and blood", "fab"]),
        new("star_wars_unlimited", "Star Wars: Unlimited", Tcg, 250, ["star wars unlimited", "swu"]),
        new("gundam", "Gundam", Tcg, 210, ["gundam"]),
        new("union_arena", "Union Arena", Tcg, 300, ["union arena"]),
        new("weiss_schwarz", "Weiss Schwarz", Tcg, 350, ["weiss schwarz", "weiss"]),
        new("vanguard", "Cardfight!! Vanguard", Tcg, 200, ["cardfight vanguard", "vanguard"]),
        new("shadowverse", "Shadowverse: Evolve", Tcg, 270, ["shadowverse"]),
        new("riftbound", "Riftbound", Tcg, 190, ["riftbound", "league of legends tcg"]),
        new("final_fantasy", "Final Fantasy TCG", Tcg, 220, ["final fantasy", "fftcg"]),
        new("other_tcg", "Other TCG", Tcg, 160, []),
        new("basketball", "Basketball", Sports, 45, ["basketball", "nba", "pba", "wnba", "fiba"]),
        new("baseball", "Baseball", Sports, 140, ["baseball", "mlb", "npb"]),
        new("american_football", "American Football", Sports, 120, ["american football", "nfl"]),
        new("soccer", "Soccer", Sports, 150, ["soccer", "football", "premier league", "world cup"]),
        new("hockey", "Hockey", Sports, 240, ["hockey", "nhl"]),
        new("racing", "Racing", Sports, 10, ["formula 1", "formula one", "f1", "racing", "nascar"]),
        new("combat_sports", "Combat Sports", Sports, 0, ["ufc", "mma", "boxing", "wwe", "wrestling"]),
        new("other_sports", "Other Sports", Sports, 100, ["golf", "tennis"]),
        new("kayou", "Kayou", NonSport, 40, ["kayou", "naruto", "ultraman"]),
        new("marvel", "Marvel & Comics", NonSport, 20, ["marvel", "comics"]),
        new("movies_tv", "Movies & TV", NonSport, 260, ["movies"]),
        new("other_nonsport", "Other Non-Sport", NonSport, 310, []),
    ];

    private static readonly Dictionary<string, CategoryInfo> BySlug = All.ToDictionary(c => c.Slug);

    // longest first, so "american football" wins over "football"
    private static readonly (string Alias, string Slug)[] AliasIndex = All
        .SelectMany(c => c.Aliases.Select(a => (Alias: Normalize(a), c.Slug)))
        .OrderByDescending(x => x.Alias.Length)
        .ToArray();

    public static bool IsValid(string? slug) => slug is not null && BySlug.ContainsKey(slug);

    public static CategoryInfo? Find(string? slug) =>
        slug is not null && BySlug.TryGetValue(slug, out var category) ? category : null;

    public static bool IsSports(string? slug) => Find(slug)?.Group == Sports;

    /// <summary>Slug of the category whose alias appears in the text as whole words, else null.</summary>
    public static string? MatchAlias(string text)
    {
        var padded = $" {Normalize(text)} ";
        foreach (var (alias, slug) in AliasIndex)
            if (padded.Contains($" {alias} ", StringComparison.Ordinal))
                return slug;
        return null;
    }

    private static string Normalize(string s) =>
        Regex.Replace(s.ToLowerInvariant(), @"[^\p{L}\p{Nd}]+", " ").Trim();
}
