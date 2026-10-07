namespace Atlas.Web.Api.Listings;

/// <summary>A seller ranked by paid orders in the last 30 days, with a few live listings for the preview panel.</summary>
public sealed record TopSellerDto(Guid Id, string DisplayName, int Sales, bool Verified, IReadOnlyList<ListingDto> Listings);
