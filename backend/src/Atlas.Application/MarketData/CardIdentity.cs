namespace Atlas.Application.MarketData;

/// <summary>
/// Provider-agnostic identity of a collectible card. Works for sports cards
/// (player/set/year) and TCG (character name carried in Player).
/// </summary>
public sealed record CardIdentity(string Player, int Year, string Set, string? Parallel = null)
{
    /// <summary>Stable key for price_history.card_identity_key.</summary>
    public string ToKey() =>
        string.Join("|", new[] { Player.Trim().ToLowerInvariant(), Year.ToString(), Set.Trim().ToLowerInvariant(), Parallel?.Trim().ToLowerInvariant() ?? "" });

    public override string ToString() => $"{Year} {Set}{(Parallel is null ? "" : $" {Parallel}")} — {Player}";
}
