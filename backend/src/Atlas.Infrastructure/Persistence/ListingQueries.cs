using Atlas.Domain.Listings;
using Atlas.Domain.Pricing;
using Microsoft.EntityFrameworkCore;

namespace Atlas.Infrastructure.Persistence;

public static class ListingQueries
{
    /// <summary>
    /// Active listings a buyer can act on right now. An auction past its end time is
    /// excluded even though nothing settles it yet (settlement ships in P5).
    /// </summary>
    public static IQueryable<Listing> LiveListings(this AtlasDbContext db, DateTime now) =>
        db.Listings.AsNoTracking().Where(l => l.Status == ListingStatus.Active
            && (l.ListingFormat != ListingFormat.Auction
                || db.Auctions.Any(a => a.ListingId == l.Id && a.EndTime > now)));

    /// <summary>Live listing count per category slug. Categories with none are absent from the result.</summary>
    public static Task<Dictionary<string, int>> LiveCountsByCategory(
        this IQueryable<Listing> liveListings, CancellationToken ct = default) =>
        liveListings
            .GroupBy(l => l.Category)
            .Select(g => new { Slug = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Slug, x => x.Count, ct);

    /// <summary>Soonest-ending auction first, in SQL, so the order holds across every page.</summary>
    public static IQueryable<Listing> OrderByEndingSoonest(this IQueryable<Listing> listings, AtlasDbContext db) =>
        listings.OrderBy(l => db.Auctions.Where(a => a.ListingId == l.Id).Select(a => a.EndTime).First());

    /// <summary>Market data only: seeded demo history is never evidence of a price.</summary>
    public static IQueryable<PriceHistory> RealSales(this IQueryable<PriceHistory> history) =>
        history.Where(h => h.Source != "seed");
}
