namespace Atlas.Web.Api.Listings;

public sealed record SellerPageDto(SellerDto Seller, IReadOnlyList<ListingDto> Listings);
