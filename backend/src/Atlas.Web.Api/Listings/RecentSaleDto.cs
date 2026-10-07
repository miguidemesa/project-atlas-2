namespace Atlas.Web.Api.Listings;

public sealed record RecentSaleDto(Guid ListingId, string Title, string Category, decimal Price, DateTime SoldAt, string? ImageUrl);
