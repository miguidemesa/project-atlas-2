using System.Text.RegularExpressions;

namespace Atlas.Application.Listings;

/// <summary>
/// "Same card" until the P3 catalog exists: game, card name, set and card number, ignoring case and
/// spacing. P3 replaces this with the catalog id; callers only ever pass the key around.
/// </summary>
public static partial class CardKey
{
    public static string For(string category, string player, string set, string? cardNumber) =>
        string.Join('|', Norm(category), Norm(player), Norm(set), Norm(cardNumber ?? string.Empty));

    public static bool TryParse(string key, out (string Category, string Player, string Set, string Number) parts)
    {
        var p = key.Split('|');
        parts = p.Length == 4 ? (p[0], p[1], p[2], p[3]) : default;
        return p.Length == 4 && p[0].Length > 0 && p[1].Length > 0;
    }

    private static string Norm(string s) => Spaces().Replace(s.Trim().ToLowerInvariant(), " ");

    [GeneratedRegex(@"\s+")]
    private static partial Regex Spaces();
}
