using System.Text.RegularExpressions;
using Atlas.Application.Ai;

namespace Atlas.Infrastructure.Ai;

/// <summary>
/// Deterministic keyword parser — zero cost, instant, offline. Covers the
/// common phrasings; anything it can't structure stays as free-text q.
/// </summary>
public partial class RuleBasedSearchParser : ISearchQueryParser
{
    [GeneratedRegex(@"(?:under|below|less than|max(?:imum)?|<=?)\s*(?:₱|php|p)?\s*([\d,]+(?:\.\d{1,2})?)", RegexOptions.IgnoreCase)]
    private static partial Regex PricePattern();

    public Task<ParsedSearch> ParseAsync(string query, CancellationToken ct = default)
    {
        var q = query.ToLowerInvariant();
        string? category = null, format = null, type = null;
        bool? graded = null;
        decimal? maxPrice = null;

        if (q.Contains("pokémon") || q.Contains("pokemon")) category = "pokemon";
        else if (q.Contains("one piece")) category = "one_piece";
        else if (q.Contains("lorcana") || q.Contains("disney")) category = "disney";
        else if (q.Contains("nba") || q.Contains("basketball")) category = "nba";

        if (Regex.IsMatch(q, @"\b(psa|bgs|sgc|graded|slab)\b"))
            graded = true;

        if (Regex.IsMatch(q, @"\bauction|\bbids?\b"))
            format = "auction";
        else if (Regex.IsMatch(q, @"\bbuy( now|-now)?\b|\bfixed\b"))
            format = "fixed";

        if (Regex.IsMatch(q, @"\blots?\b")) type = "lot";
        else if (Regex.IsMatch(q, @"\b(sealed|hobby box|booster)\b")) type = "hobby_box";
        else if (Regex.IsMatch(q, @"\bsingles?\b")) type = "single_card";

        var m = PricePattern().Match(q);
        if (m.Success)
        {
            var digits = m.Groups[1].Value.Replace(",", "");
            if (decimal.TryParse(digits, out var v)) maxPrice = v;
        }

        return Task.FromResult(new ParsedSearch(category, format, type, graded, maxPrice, Player: null));
    }
}
