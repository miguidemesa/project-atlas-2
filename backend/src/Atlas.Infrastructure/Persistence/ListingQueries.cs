using Atlas.Domain.Listings;
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
}
