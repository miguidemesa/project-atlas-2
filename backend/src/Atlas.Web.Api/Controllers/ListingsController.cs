using Atlas.Application.Pricing;
using Atlas.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Atlas.Web.Api.Controllers;

public sealed record DealScoreDto(string Rating, decimal MedianPhp, double DeltaPct, int Samples);

public sealed record ListingDto(
    Guid Id,
    string Category,
    string Title,
    string Player,
    string Team,
    int Year,
    string Set,
    string? Parallel,
    bool Numbered,
    string? SerialNumber,
    bool Graded,
    string? GradingCompany,
    string? GradeValue,
    string? Condition,
    string? Description,
    Guid SellerId,
    decimal Price,
    decimal? PreviousPrice,
    decimal? CurrentBid,
    int? BidCount,
    DateTime? EndsAt,
    string Type,
    string Format,
    DateTime CreatedAt,
    DealScoreDto? DealScore);

public sealed record SellerDto(
    Guid UserId,
    string DisplayName,
    string Handle,
    decimal RatingAvg,
    int RatingCount,
    int SoldCount,
    int JoinedYear,
    bool Verified);

public sealed record PricePointDto(string Date, decimal Price);

public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);

[ApiController]
[Route("api/listings")]
public class ListingsController(AtlasDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Feed(
        [FromQuery] string? category,
        [FromQuery] string? format,
        [FromQuery] string? type,
        [FromQuery] bool? graded,
        [FromQuery] decimal? maxPrice,
        [FromQuery] string? player,
        [FromQuery] string? q,
        [FromQuery] string? sort,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 24,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 60);

        var query = db.Listings.AsNoTracking().Where(l => l.Status == Domain.Listings.ListingStatus.Active);

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(l => l.Sport == category); // sport column carries category until the rename migration
        if (format == "fixed" || format == "auction")
            query = query.Where(l => l.ListingFormat == (format == "auction"
                ? Domain.Listings.ListingFormat.Auction
                : Domain.Listings.ListingFormat.FixedPrice));
        if (Enum.TryParse<Domain.Listings.ListingType>(type, ignoreCase: true, out var listingType))
            query = query.Where(l => l.Type == listingType);
        if (graded == true)
            query = query.Where(l => l.Graded);
        if (maxPrice is { } cap)
            query = query.Where(l => l.Price <= cap);
        if (!string.IsNullOrWhiteSpace(player))
            query = query.Where(l => l.Player == player);
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(l =>
                EF.Functions.ILike(l.Title, $"%{q}%") ||
                EF.Functions.ILike(l.Player, $"%{q}%") ||
                EF.Functions.ILike(l.Set, $"%{q}%"));

        query = sort switch
        {
            "price_asc" => query.OrderBy(l => l.Price),
            "price_desc" => query.OrderByDescending(l => l.Price),
            _ => query.OrderByDescending(l => l.CreatedAt),
        };

        var total = await query.CountAsync(ct);
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var auctions = await AuctionsFor(items, ct);
        var bidCounts = await BidCountsFor(items.Select(l => l.Id), ct);
        var scores = await DealScoresFor(items, ct);

        var dtos = items
            .Select(l =>
            {
                auctions.TryGetValue(l.Id, out var auction);
                return ToDto(l, auction, bidCounts.GetValueOrDefault(l.Id), ToScoreDto(scores.GetValueOrDefault(l.Id)));
            })
            .ToList();

        // ending-soon sort happens in memory once auction end times are known
        if (sort == "ending")
            dtos = dtos.OrderBy(d => d.EndsAt ?? DateTime.MaxValue).ToList();

        return Ok(new { data = new PagedResult<ListingDto>(dtos, total, page, pageSize) });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Detail(Guid id, CancellationToken ct)
    {
        var listing = await db.Listings.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id, ct);
        if (listing is null)
            return NotFound(new { error = "Listing not found." });

        var sellerProfile = await db.SellerProfiles.AsNoTracking()
            .FirstOrDefaultAsync(s => s.UserId == listing.SellerId, ct);
        var historyRows = await db.PriceHistory.AsNoTracking()
            .Where(h => h.CardIdentityKey == id.ToString())
            .OrderBy(h => h.SaleDate)
            .ToListAsync(ct);
        var auctions = await AuctionsFor([listing], ct);
        var bidCounts = await BidCountsFor([listing.Id], ct);

        var dealScore = listing.ListingFormat == Domain.Listings.ListingFormat.FixedPrice
            ? DealScoreService.Evaluate(listing.Price, historyRows.Select(h => h.SalePrice).ToList())
            : null;

        var dto = new
        {
            listing = ToDto(listing, auctions.GetValueOrDefault(id), bidCounts.GetValueOrDefault(id), ToScoreDto(dealScore), includeDescription: true),
            seller = sellerProfile is null ? null : new SellerDto(
                sellerProfile.UserId,
                sellerProfile.DisplayName,
                sellerProfile.DisplayName.ToLowerInvariant().Replace(" ", "").Replace("&", ""),
                sellerProfile.RatingAvg,
                sellerProfile.RatingCount,
                sellerProfile.SoldCount,
                sellerProfile.JoinedDate.Year,
                sellerProfile.VerificationBadge),
            history = historyRows.Select(h => new PricePointDto(h.SaleDate.ToString("yyyy-MM-dd"), h.SalePrice)).ToList(),
        };
        return Ok(new { data = dto });
    }

    private async Task<Dictionary<Guid, int>> BidCountsFor(IEnumerable<Guid> listingIds, CancellationToken ct)
    {
        var ids = listingIds.ToList();
        return await db.Bids.AsNoTracking()
            .Where(b => ids.Contains(b.ListingId))
            .GroupBy(b => b.ListingId)
            .ToDictionaryAsync(g => g.Key, g => g.Count(), ct);
    }

    private async Task<Dictionary<Guid, Domain.Auctions.Auction>> AuctionsFor(IReadOnlyList<Domain.Listings.Listing> listings, CancellationToken ct)
    {
        var ids = listings.Select(l => l.Id).ToList();
        return await db.Auctions.AsNoTracking()
            .Where(a => ids.Contains(a.ListingId))
            .ToDictionaryAsync(a => a.ListingId, ct);
    }

    private async Task<Dictionary<Guid, DealScoreResult?>> DealScoresFor(List<Domain.Listings.Listing> listings, CancellationToken ct)
    {
        var fixedIds = listings
            .Where(l => l.ListingFormat == Domain.Listings.ListingFormat.FixedPrice)
            .Select(l => l.Id.ToString())
            .ToList();
        if (fixedIds.Count == 0)
            return [];

        var histories = await db.PriceHistory.AsNoTracking()
            .Where(h => fixedIds.Contains(h.CardIdentityKey))
            .GroupBy(h => h.CardIdentityKey)
            .ToDictionaryAsync(g => g.Key, g => g.Select(x => x.SalePrice).ToList(), ct);

        return listings.ToDictionary(
            l => l.Id,
            l => histories.TryGetValue(l.Id.ToString(), out var prices)
                ? DealScoreService.Evaluate(l.Price, prices)
                : null);
    }

    private static DealScoreDto? ToScoreDto(DealScoreResult? score) =>
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

    private static ListingDto ToDto(
        Domain.Listings.Listing l,
        Domain.Auctions.Auction? auction,
        int bidCount,
        DealScoreDto? score = null,
        bool includeDescription = false) =>
        new(
            l.Id,
            l.Sport,
            l.Title,
            l.Player,
            l.Team,
            l.Year,
            l.Set,
            l.Parallel,
            l.Numbered,
            l.SerialNumber,
            l.Graded,
            l.GradingCompany,
            l.GradeValue,
            l.Condition,
            includeDescription ? l.Description : null,
            l.SellerId,
            l.Price,
            null, // previous sale price arrives from market ingestion later
            auction?.CurrentBid,
            auction is null ? null : bidCount,
            auction?.EndTime,
            l.Type.ToString().ToLowerInvariant(),
            l.ListingFormat.ToString().ToLowerInvariant(),
            l.CreatedAt,
            score);
}
