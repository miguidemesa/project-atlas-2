using Atlas.Application.Listings;
using Atlas.Application.Pricing;
using Atlas.Domain.Listings;
using Atlas.Domain.Orders;
using Atlas.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Atlas.Web.Api.Listings;

/// <summary>
/// Listing rows → API DTOs in a fixed number of queries (auctions, bid counts,
/// deal scores, seller names, photos), whatever the page size.
/// </summary>
public sealed class ListingDtoBuilder(AtlasDbContext db)
{
    public async Task<List<ListingDto>> BuildAsync(IReadOnlyList<Listing> listings, CancellationToken ct, bool withDetail = false)
    {
        if (listings.Count == 0) return [];
        var ids = listings.Select(l => l.Id).ToList();

        var auctions = await db.Auctions.AsNoTracking()
            .Where(a => ids.Contains(a.ListingId))
            .ToDictionaryAsync(a => a.ListingId, ct);
        var bidCounts = await db.Bids.AsNoTracking()
            .Where(b => ids.Contains(b.ListingId))
            .GroupBy(b => b.ListingId)
            .ToDictionaryAsync(g => g.Key, g => g.Count(), ct);
        var scores = await DealScoresAsync(listings, ct);
        var sellers = await SellersAsync(listings.Select(l => l.SellerId), ct);
        var photos = withDetail ? await PhotosAsync(ids, ct) : new Dictionary<Guid, List<string>>();

        return listings.Select(l =>
        {
            auctions.TryGetValue(l.Id, out var auction);
            IReadOnlyList<string> listingPhotos = photos.GetValueOrDefault(l.Id)
                ?? (l.ImageUrl is null ? [] : [l.ImageUrl]);
            return new ListingDto(
                l.Id, l.Category, l.Title, l.Player, l.Team, l.Year, l.Set, l.CardNumber, l.Language,
                l.Parallel, l.Numbered, l.SerialNumber, l.Graded, l.GradingCompany, l.GradeValue, l.Condition,
                withDetail ? l.Description : null,
                l.ImageUrl,
                withDetail ? listingPhotos : [],
                l.SellerId,
                sellers.GetValueOrDefault(l.SellerId).Name ?? string.Empty,
                sellers.GetValueOrDefault(l.SellerId).Verified,
                l.Price,
                auction?.CurrentBid,
                auction is null ? null : bidCounts.GetValueOrDefault(l.Id),
                auction?.EndTime,
                ListingTypes.ToName(l.Type),
                l.ListingFormat == ListingFormat.Auction ? "auction" : "fixed",
                ApiStatus(l.Status),
                l.ViewCount,
                l.CreatedAt,
                l.UpdatedAt,
                ScoreDto(scores.GetValueOrDefault(l.Id)));
        }).ToList();
    }

    /// <summary>
    /// Public seller summary from real data only: reviews, completed sales and verification.
    /// Falls back to the account name for sellers who never got a profile.
    /// </summary>
    public async Task<SellerDto?> SellerAsync(Guid sellerId, CancellationToken ct)
    {
        var profile = await db.SellerProfiles.AsNoTracking().FirstOrDefaultAsync(s => s.UserId == sellerId, ct);
        var user = await db.Users.AsNoTracking()
            .Where(u => u.Id == sellerId)
            .Select(u => new { u.Name, u.CreatedAt })
            .FirstOrDefaultAsync(ct);
        if (profile is null && user is null) return null;

        var reviews = await db.Reviews.AsNoTracking()
            .Where(r => r.RevieweeId == sellerId)
            .GroupBy(_ => 1)
            .Select(g => new { Count = g.Count(), Average = g.Average(r => (double)r.Rating) })
            .FirstOrDefaultAsync(ct);
        var sold = await db.Orders.AsNoTracking()
            .CountAsync(o => o.SellerId == sellerId && o.Status == OrderStatus.FundsReleased, ct);

        return new SellerDto(
            sellerId,
            profile?.DisplayName ?? user!.Name,
            reviews is null ? null : Math.Round((decimal)reviews.Average, 1),
            reviews?.Count ?? 0,
            sold,
            (profile?.JoinedDate ?? user!.CreatedAt).Year,
            profile?.VerificationBadge ?? false);
    }

    /// <summary>Real sale history of one listing, oldest first. Seed rows are not market data.</summary>
    public async Task<List<PricePointDto>> HistoryAsync(Guid listingId, CancellationToken ct) =>
        (await db.PriceHistory.AsNoTracking().RealSales()
            .Where(h => h.CardIdentityKey == listingId.ToString())
            .OrderBy(h => h.SaleDate)
            .Select(h => new { h.SaleDate, h.SalePrice })
            .ToListAsync(ct))
        .Select(h => new PricePointDto(h.SaleDate.ToString("yyyy-MM-dd"), h.SalePrice))
        .ToList();

    /// <summary>Each seller's shown name and verified mark; users without a seller profile are never verified.</summary>
    private async Task<Dictionary<Guid, (string Name, bool Verified)>> SellersAsync(IEnumerable<Guid> sellerIds, CancellationToken ct)
    {
        var ids = sellerIds.Distinct().ToList();
        var sellers = await db.SellerProfiles.AsNoTracking()
            .Where(s => ids.Contains(s.UserId))
            .ToDictionaryAsync(s => s.UserId, s => (s.DisplayName, s.VerificationBadge), ct);
        var missing = ids.Where(id => !sellers.ContainsKey(id)).ToList();
        if (missing.Count > 0)
        {
            var users = await db.Users.AsNoTracking()
                .Where(u => missing.Contains(u.Id))
                .Select(u => new { u.Id, u.Name })
                .ToListAsync(ct);
            foreach (var u in users) sellers[u.Id] = (u.Name, false);
        }
        return sellers;
    }

    private async Task<Dictionary<Guid, List<string>>> PhotosAsync(List<Guid> ids, CancellationToken ct) =>
        (await db.ListingPhotos.AsNoTracking()
            .Where(p => ids.Contains(p.ListingId) && p.Url != null)
            .OrderBy(p => p.SortOrder)
            .Select(p => new { p.ListingId, Url = p.Url! })
            .ToListAsync(ct))
        .GroupBy(p => p.ListingId)
        .ToDictionary(g => g.Key, g => g.Select(p => p.Url).ToList());

    private async Task<Dictionary<Guid, DealScoreResult?>> DealScoresAsync(IReadOnlyList<Listing> listings, CancellationToken ct)
    {
        var keys = listings
            .Where(l => l.ListingFormat == ListingFormat.FixedPrice)
            .Select(l => l.Id.ToString())
            .ToList();
        if (keys.Count == 0) return [];

        var histories = await db.PriceHistory.AsNoTracking().RealSales()
            .Where(h => keys.Contains(h.CardIdentityKey))
            .GroupBy(h => h.CardIdentityKey)
            .ToDictionaryAsync(g => g.Key, g => g.Select(x => x.SalePrice).ToList(), ct);

        return listings.ToDictionary(
            l => l.Id,
            l => histories.TryGetValue(l.Id.ToString(), out var prices) ? DealScoreService.Evaluate(l.Price, prices) : null);
    }

    private static DealScoreDto? ScoreDto(DealScoreResult? score) =>
        score is null ? null : new DealScoreDto(
            score.Rating switch
            {
                DealRating.GreatDeal => "great",
                DealRating.Fair => "fair",
                _ => "above",
            },
            score.MedianPricePhp,
            (double)score.DeltaPct,
            score.SampleCount);

    private static string ApiStatus(ListingStatus status) => status switch
    {
        ListingStatus.Sold => "sold",
        ListingStatus.Ended => "ended",
        ListingStatus.Cancelled => "cancelled",
        ListingStatus.Draft => "draft",
        _ => "active",
    };
}
