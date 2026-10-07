namespace Atlas.Web.Api.Listings;

public sealed record ListingDetailDto(ListingDto Listing, SellerDto? Seller, IReadOnlyList<PricePointDto> History);
