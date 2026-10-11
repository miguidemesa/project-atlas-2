namespace Atlas.Web.Api.Listings;

/// <summary>Query string of GET /api/listings.</summary>
public sealed class FeedQuery
{
    public string? Category { get; init; }
    public string? Format { get; init; }
    public string? Type { get; init; }
    public bool? Graded { get; init; }
    public decimal? MinPrice { get; init; }
    public decimal? MaxPrice { get; init; }
    public string? Language { get; init; }
    public string? Player { get; init; }
    public string? Q { get; init; }

    /// <summary>A CardKey: listings of exactly that card, any condition (the compare view).</summary>
    public string? Card { get; init; }

    /// <summary>newest (default) | popular | price_asc | price_desc | ending</summary>
    public string? Sort { get; init; }

    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 24;
}
