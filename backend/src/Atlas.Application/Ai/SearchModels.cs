namespace Atlas.Application.Ai;

public sealed record ParsedSearch(
    string? Category,
    string? Format,
    string? Type,
    bool? Graded,
    decimal? MaxPrice,
    string? Player);

/// <summary>
/// Turns free-text like "graded wemby under ₱30k" into structured filters.
/// Implementations: LLM-backed when an API key is configured; deterministic
/// rules otherwise (also the fallback when the LLM fails or hallucinates).
/// </summary>
public interface ISearchQueryParser
{
    Task<ParsedSearch> ParseAsync(string query, CancellationToken ct = default);
}
