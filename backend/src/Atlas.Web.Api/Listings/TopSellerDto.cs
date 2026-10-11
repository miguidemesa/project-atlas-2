namespace Atlas.Web.Api.Listings;

/// <summary>
/// A seller ranked by paid orders in the last 30 days, with real review and live listing counts and a few live
/// listings for the showcase. RatingAvg stays null until the first review.
/// </summary>
public sealed record TopSellerDto(
    Guid Id, string DisplayName, int Sales, bool Verified, decimal? RatingAvg, int RatingCount, int LiveListings,
    IReadOnlyList<ListingDto> Listings);
