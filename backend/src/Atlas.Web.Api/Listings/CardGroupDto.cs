namespace Atlas.Web.Api.Listings;

/// <summary>Live listings of one card (see CardKey) from one or more sellers; Lead is the cheapest.</summary>
public sealed record CardGroupDto(string Key, ListingDto Lead, int Sellers, int Listings, decimal FromPrice, IReadOnlyList<string> Conditions);
