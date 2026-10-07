using Atlas.Domain.Listings;
using Atlas.Domain.Orders;
using Atlas.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Atlas.Web.Api.Listings;

/// <summary>
/// Home page and game hub shelves from real marketplace data only, ported from
/// atlas-ph's StorefrontService. Under-market deals and price movers join in P3,
/// upcoming events in P4.
/// </summary>
public sealed class StorefrontService(AtlasDbContext db, ListingDtoBuilder dtos, IMemoryCache cache, TimeProvider time)
{
    private static readonly TimeSpan CacheFor = TimeSpan.FromSeconds(60);
    private static readonly TimeSpan TrendingWindow = TimeSpan.FromDays(30);
    private const int SpotlightSize = 5;
    private const int GrailsSize = 4;
    private const int Shelf = 8;
    private const int Grid = 12;

    /// <summary>The busiest pages, so each is rebuilt at most once a minute per category.</summary>
    public async Task<StorefrontDto> GetAsync(string? category, CancellationToken ct) =>
        (await cache.GetOrCreateAsync($"storefront:{category ?? "all"}", entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheFor;
            return BuildAsync(category, ct);
        }))!;

    private async Task<StorefrontDto> BuildAsync(string? category, CancellationToken ct)
    {
        var now = time.GetUtcNow().UtcDateTime;
        var live = db.LiveListings(now);
        var scoped = category is null ? live : live.Where(l => l.Category == category);

        // door counts always cover every game, so a hub can link to the others
        var counts = await live.LiveCountsByCategory(ct);

        var spotlight = await scoped.Where(l => l.ImageUrl != null)
            .OrderByDescending(l => l.ViewCount).ThenByDescending(l => l.CreatedAt).ThenBy(l => l.Id)
            .Take(SpotlightSize).ToListAsync(ct);
        var spotlightIds = spotlight.Select(l => l.Id).ToList();

        var trendingSince = now - TrendingWindow;
        var trending = await scoped.Where(l => l.CreatedAt >= trendingSince && !spotlightIds.Contains(l.Id))
            .OrderByDescending(l => l.ViewCount).ThenByDescending(l => l.CreatedAt).ThenBy(l => l.Id)
            .Take(Shelf).ToListAsync(ct);

        var grails = await scoped.Where(l => l.ListingFormat == ListingFormat.FixedPrice && !spotlightIds.Contains(l.Id))
            .OrderByDescending(l => l.Price).ThenBy(l => l.Id)
            .Take(GrailsSize).ToListAsync(ct);

        var endingSoon = await scoped.Where(l => l.ListingFormat == ListingFormat.Auction)
            .OrderByEndingSoonest(db)
            .Take(Shelf).ToListAsync(ct);

        var newArrivals = await scoped.OrderByDescending(l => l.CreatedAt).ThenBy(l => l.Id).Take(Grid).ToListAsync(ct);

        // real paid orders only; an empty shelf stays empty
        var recentlySold = await db.Orders.AsNoTracking()
            .Where(o => o.PaidAt != null && o.Status != OrderStatus.Cancelled && o.Status != OrderStatus.Refunded)
            .Join(db.Listings.AsNoTracking(), o => o.ListingId, l => l.Id, (o, l) => new { o, l })
            .Where(x => category == null || x.l.Category == category)
            .OrderByDescending(x => x.o.PaidAt)
            .Take(Shelf)
            .Select(x => new RecentSaleDto(x.l.Id, x.l.Title, x.l.Category, x.o.Price, x.o.PaidAt!.Value, x.l.ImageUrl))
            .ToListAsync(ct);

        List<SetSummaryDto> sets = category is null ? [] : (await scoped
                .Where(l => l.Type != ListingType.Accessory)
                .GroupBy(l => l.Set)
                .Select(g => new
                {
                    Name = g.Key,
                    Count = g.Count(),
                    From = g.Where(l => l.ListingFormat == ListingFormat.FixedPrice).Min(l => (decimal?)l.Price),
                })
                .OrderByDescending(s => s.Count).ThenBy(s => s.Name)
                .Take(Shelf)
                .ToListAsync(ct))
            .Select(s => new SetSummaryDto(s.Name, s.Count, s.From))
            .ToList();

        return new StorefrontDto(
            category,
            counts.Where(c => category == null || c.Key == category).Sum(c => c.Value),
            counts.OrderByDescending(c => c.Value).ThenBy(c => c.Key).Select(c => new CategoryCountDto(c.Key, c.Value)).ToList(),
            await dtos.BuildAsync(spotlight, ct),
            await dtos.BuildAsync(trending, ct),
            await dtos.BuildAsync(grails, ct),
            await dtos.BuildAsync(endingSoon, ct),
            await dtos.BuildAsync(newArrivals, ct),
            recentlySold,
            sets,
            now);
    }
}
