using System.Data;
using Atlas.Domain.Auctions;
using Atlas.Domain.Listings;
using Atlas.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Atlas.Infrastructure.Bids;

public sealed record BidDto(Guid Id, decimal Amount, DateTime CreatedAt, string BidderMasked);

public sealed record PlaceBidResult(decimal NewCurrentBid, DateTime EndsAtUtc, int TotalBids);

public sealed class BidConflictException(string message) : Exception(message);
public sealed class BidForbiddenException : Exception;

public interface IBidService
{
    /// <summary>
    /// Places a bid validated atomically: the auction row is locked
    /// (SELECT … FOR UPDATE) so concurrent bids serialize and every check
    /// sees committed truth — domain rule 4.
    /// </summary>
    Task<PlaceBidResult> PlaceBidAsync(Guid listingId, Guid bidderId, decimal amount, CancellationToken ct = default);
    Task<IReadOnlyList<BidDto>> HistoryAsync(Guid listingId, CancellationToken ct = default);
}

public sealed class BidService(AtlasDbContext db) : IBidService
{
    private const decimal MinIncrement = 500m;
    private static readonly TimeSpan AntiSnipeWindow = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan AntiSnipeExtension = TimeSpan.FromMinutes(5);

    public async Task<PlaceBidResult> PlaceBidAsync(Guid listingId, Guid bidderId, decimal amount, CancellationToken ct = default)
    {
        if (amount <= 0)
            throw new BidConflictException("Enter a bid amount.");

        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);

        // row-level lock: concurrent bidders queue here until we commit
        var auction = await db.Auctions
            .FromSqlInterpolated($"SELECT * FROM auctions WHERE listing_id = {listingId} FOR UPDATE")
            .FirstOrDefaultAsync(ct);

        if (auction is null)
            throw new KeyNotFoundException("Auction not found.");

        var listing = await db.Listings.FirstAsync(l => l.Id == listingId, ct);
        if (listing.SellerId == bidderId)
            throw new BidForbiddenException(); // domain rule 1: sellers can't bid on their own listing

        var now = DateTime.UtcNow;
        if (listing.Status != ListingStatus.Active || auction.Status != AuctionStatus.Active || auction.EndTime <= now)
            throw new BidConflictException("This auction has ended.");

        var floor = auction.CurrentBid is { } current ? current + MinIncrement : auction.StartPrice;
        if (amount < floor)
            throw new BidConflictException(auction.CurrentBid is null
                ? $"Opening bid must be at least ₱{floor:0}."
                : $"Bid at least ₱{MinIncrement:0} above the current bid (₱{floor:0} or more).");

        // anti-snipe: late bids push the finish line back
        if (auction.EndTime - now <= AntiSnipeWindow)
            auction.EndTime = now.Add(AntiSnipeExtension);

        db.Bids.Add(new Domain.Auctions.Bid
        {
            Id = Guid.NewGuid(),
            ListingId = listingId,
            BidderId = bidderId,
            Amount = amount,
            CreatedAt = now,
        });
        auction.CurrentBid = amount;
        auction.CurrentBidderId = bidderId;

        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        var total = await db.Bids.CountAsync(b => b.ListingId == listingId, ct);
        return new PlaceBidResult(amount, auction.EndTime, total);
    }

    public async Task<IReadOnlyList<BidDto>> HistoryAsync(Guid listingId, CancellationToken ct = default)
    {
        var rows = await db.Bids.AsNoTracking()
            .Where(b => b.ListingId == listingId)
            .OrderByDescending(b => b.Amount)
            .Take(20)
            .Join(db.Users.AsNoTracking(),
                b => b.BidderId,
                u => u.Id,
                (b, u) => new BidDto(b.Id, b.Amount, b.CreatedAt, MaskHandle(u.Name)))
            .ToListAsync(ct);
        return rows;
    }

    private static string MaskHandle(string name)
    {
        var parts = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var first = parts[0];
        return $"{first[0]}{new string('*', Math.Max(2, first.Length - 1))}";
    }
}
