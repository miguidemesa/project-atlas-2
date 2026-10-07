namespace Atlas.Web.Api.Listings;

public sealed record DealScoreDto(string Rating, decimal MedianPhp, double DeltaPct, int Samples);
