namespace Atlas.Web.Api.Listings;

/// <summary>Home page shelves, or one game's hub. An empty shelf means "hide this section".</summary>
public sealed record StorefrontDto(
    string? Category,
    int ActiveListings,
    IReadOnlyList<CategoryCountDto> Categories,
    IReadOnlyList<ListingDto> Spotlight,
    IReadOnlyList<ListingDto> Trending,
    IReadOnlyList<ListingDto> Grails,
    IReadOnlyList<ListingDto> EndingSoon,
    IReadOnlyList<ListingDto> NewArrivals,
    IReadOnlyList<RecentSaleDto> RecentlySold,
    IReadOnlyList<SetSummaryDto> Sets,
    DateTime GeneratedAt);
