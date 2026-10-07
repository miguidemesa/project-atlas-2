using System.Globalization;
using System.Text.RegularExpressions;
using Atlas.Application.Ai;
using Atlas.Application.Listings;

namespace Atlas.Infrastructure.Ai;

/// <summary>
/// Deterministic keyword parser — zero cost, instant, offline. Covers the
/// common phrasings; anything it can't structure stays as free-text q.
/// </summary>
public partial class RuleBasedSearchParser : ISearchQueryParser
{
    [GeneratedRegex(@"(?:under|below|less than|max(?:imum)?|<=?)\s*(?:₱|php|p)?\s*([\d,]+(?:\.\d{1,2})?)\s*(k)?\b", RegexOptions.IgnoreCase)]
    private static partial Regex PricePattern();

    public Task<ParsedSearch> ParseAsync(string query, CancellationToken ct = default)
    {
        var q = query.ToLowerInvariant();
        string? format = null, type = null;
        bool? graded = null;
        decimal? maxPrice = null;

        var category = CategoryList.MatchAlias(query);

        if (Regex.IsMatch(q, @"\b(psa|bgs|cgc|sgc|tag|graded|slab)\b"))
            graded = true;

        if (Regex.IsMatch(q, @"\bauction|\bbids?\b"))
            format = "auction";
        else if (Regex.IsMatch(q, @"\bbuy( now|-now)?\b|\bfixed\b"))
            format = "fixed";

        if (Regex.IsMatch(q, @"\blots?\b")) type = "lot";
        else if (Regex.IsMatch(q, @"\b(sealed|hobby box|booster)\b")) type = "hobby_box";
        else if (Regex.IsMatch(q, @"\bsingles?\b")) type = "single_card";

        var m = PricePattern().Match(q);
        if (m.Success && decimal.TryParse(m.Groups[1].Value.Replace(",", ""), NumberStyles.Number, CultureInfo.InvariantCulture, out var amount))
            maxPrice = m.Groups[2].Success ? amount * 1000 : amount;

        return Task.FromResult(new ParsedSearch(category, format, type, graded, maxPrice, Player: null));
    }
}
