namespace Atlas.Web.Api.Listings;

/// <summary>Seller stats from real data only. RatingAvg is null until the first review.</summary>
public sealed record SellerDto(Guid Id, string DisplayName, decimal? RatingAvg, int RatingCount, int SoldCount, int JoinedYear, bool Verified);
