using Atlas.Domain.Listings;
using Atlas.Domain.Orders;
using Atlas.Domain.Offers;
using Atlas.Infrastructure.Orders;
using Atlas.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Atlas.Infrastructure.Offers;

public sealed record OfferDto(
    Guid Id,
    Guid ListingId,
    string ListingTitle,
    decimal ListingPrice,
    string? ListingImageUrl,
    decimal Amount,
    string Status,
    string ViewerRole,
    bool AwaitingViewerResponse,
    DateTime CreatedAt,
    DateTime ExpiresAt);

public sealed record MakeOfferRequest(decimal Amount);
public sealed record CounterRequest(decimal Amount);

public interface IOfferService
{
    Task<OfferDto> MakeAsync(Guid buyerId, Guid listingId, decimal amount, CancellationToken ct = default);
    Task<OfferDto> CounterAsync(Guid offerId, Guid actorId, decimal amount, CancellationToken ct = default);
    Task<OrderDto> AcceptAsync(Guid offerId, Guid actorId, CancellationToken ct = default);
    Task DeclineAsync(Guid offerId, Guid actorId, CancellationToken ct = default);
    Task<(IReadOnlyList<OfferDto> Incoming, IReadOnlyList<OfferDto> Outgoing)> MineAsync(Guid userId, CancellationToken ct = default);
}

/// <summary>
/// Structured negotiation — offers are records, never chat text.
///   - fixed-price listings only, strictly below asking, above 40% of it
///   - one pending thread per buyer per listing
///   - counters capped at 5 rounds; offers expire after 48 hours
///   - acceptance atomically creates the order at the agreed price and
///     pulls the listing off the market; buyer then completes checkout
/// </summary>
public sealed class OfferService(AtlasDbContext db) : IOfferService
{
    private static readonly TimeSpan OfferLifetime = TimeSpan.FromHours(48);
    private const int MaxChainDepth = 5;
    private const decimal MinAskRatio = 0.40m;

    public async Task<OfferDto> MakeAsync(Guid buyerId, Guid listingId, decimal amount, CancellationToken ct = default)
    {
        var listing = await db.Listings.FirstOrDefaultAsync(l => l.Id == listingId, ct)
            ?? throw new KeyNotFoundException("Listing not found.");

        if (listing.SellerId == buyerId)
            throw new InvalidOperationException("You can't make an offer on your own listing.");
        if (listing.Status != ListingStatus.Active || listing.ListingFormat != ListingFormat.FixedPrice)
            throw new InvalidOperationException("Offers apply to active fixed-price listings only.");
        if (amount >= listing.Price)
            throw new InvalidOperationException("That's the asking price — just use Buy Now.");
        if (amount < Math.Round(listing.Price * MinAskRatio, 2))
            throw new InvalidOperationException("Offers below 40% of asking aren't accepted.");

        var hasPending = await db.Offers.AnyAsync(o =>
            o.ListingId == listingId && o.BuyerId == buyerId && o.Status == OfferStatus.Pending, ct);
        if (hasPending)
            throw new InvalidOperationException("You already have an offer pending on this listing.");

        var offer = NewOffer(listing.Id, listing.SellerId, buyerId, buyerId, amount);
        db.Offers.Add(offer);
        await db.SaveChangesAsync(ct);
        await PostCardAsync(offer, buyerId, ct);
        return await ToDtoAsync(offer, "buyer", ct);
    }

    public async Task<OfferDto> CounterAsync(Guid offerId, Guid actorId, decimal amount, CancellationToken ct = default)
    {
        var offer = await GetOfferAsync(offerId, ct);
        EnsureParticipant(offer, actorId);
        await EnsureAwaitingAsync(offer, ct);
        if (offer.CreatedById == actorId)
            throw new InvalidOperationException("Wait for the other side to respond first.");
        if (amount <= 0)
            throw new InvalidOperationException("Enter a valid amount.");

        var depth = await ChainDepthAsync(offer, ct);
        if (depth >= MaxChainDepth)
            throw new InvalidOperationException("Negotiation limit reached — accept or decline.");

        offer.Status = OfferStatus.Countered;
        offer.RespondedAt = DateTime.UtcNow;

        var counter = NewOffer(offer.ListingId, offer.SellerId, offer.BuyerId, actorId, amount,
            counterToId: offer.Id);
        db.Offers.Add(counter);
        await db.SaveChangesAsync(ct);
        await PostCardAsync(counter, actorId, ct);

        return await ToDtoAsync(counter, offer.SellerId == actorId ? "seller" : "buyer", ct);
    }

    public async Task<OrderDto> AcceptAsync(Guid offerId, Guid actorId, CancellationToken ct = default)
    {
        var offer = await GetOfferAsync(offerId, ct);
        EnsureParticipant(offer, actorId);
        await EnsureAwaitingAsync(offer, ct);
        if (offer.CreatedById == actorId)
            throw new InvalidOperationException("You can't accept your own offer — wait for their response.");

        await using var tx = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted, ct);

        var listing = await db.Listings.FirstAsync(l => l.Id == offer.ListingId, ct);
        if (listing.Status != ListingStatus.Active)
            throw new InvalidOperationException("The listing is no longer available.");

        offer.Status = OfferStatus.Accepted;
        offer.RespondedAt = DateTime.UtcNow;
        listing.Status = ListingStatus.Sold;
        listing.UpdatedAt = DateTime.UtcNow;

        var order = new Domain.Orders.Order
        {
            Id = Guid.NewGuid(),
            BuyerId = offer.BuyerId,
            SellerId = offer.SellerId,
            ListingId = offer.ListingId,
            Price = offer.Amount, // provenance of the discount lives on the offer chain
            Status = OrderStatus.PendingPayment,
            ShippingAddress = null, // buyer completes checkout next
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        await PostCardAsync(offer, actorId, ct);

        return await BuildOrderDtoAsync(order, "buyer");
    }

    public async Task DeclineAsync(Guid offerId, Guid actorId, CancellationToken ct = default)
    {
        var offer = await GetOfferAsync(offerId, ct);
        EnsureParticipant(offer, actorId);
        await EnsureAwaitingAsync(offer, ct);

        // declining your own pending offer = withdrawing it
        offer.Status = OfferStatus.Declined;
        offer.RespondedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    public async Task<(IReadOnlyList<OfferDto> Incoming, IReadOnlyList<OfferDto> Outgoing)> MineAsync(Guid userId, CancellationToken ct = default)
    {
        var rows = await db.Offers.AsNoTracking()
            .Join(db.Listings.AsNoTracking(),
                o => o.ListingId,
                l => l.Id,
                (o, l) => new { Offer = o, Title = l.Title, Price = l.Price, ImageUrl = l.ImageUrl })
            .Where(x => x.Offer.BuyerId == userId || x.Offer.SellerId == userId)
            .OrderByDescending(x => x.Offer.CreatedAt)
            .Take(50)
            .ToListAsync(ct);

        var mapped = rows.Select(x =>
        {
            var role = x.Offer.SellerId == userId ? "seller" : "buyer";
            var awaitingViewer = x.Offer.Status == OfferStatus.Pending
                && x.Offer.ExpiresAt > DateTime.UtcNow
                && x.Offer.CreatedById != userId;
            return new OfferDto(
                x.Offer.Id,
                x.Offer.ListingId,
                x.Title,
                x.Price,
                x.ImageUrl,
                x.Offer.Amount,
                x.Offer.Status.ToString().ToLowerInvariant(),
                role,
                awaitingViewer,
                x.Offer.CreatedAt,
                x.Offer.ExpiresAt);
        }).ToList();

        return (mapped.Where(o => o.ViewerRole == "seller").ToList(),
                mapped.Where(o => o.ViewerRole == "buyer").ToList());
    }


    /// <summary>Drops an interactive offer card into the buyer-seller thread.</summary>
    private async Task PostCardAsync(Offer o, Guid actorId, CancellationToken ct)
    {
        var actorRole = o.BuyerId == actorId ? "buyer" : "seller";
        var recipient = actorRole == "buyer" ? o.SellerId : o.BuyerId;
        var card = System.Text.Json.JsonSerializer.Serialize(new
        {
            type = "offer",
            offerId = o.Id,
            amount = o.Amount,
            listingId = o.ListingId,
            actorRole,
        });
        db.Messages.Add(new Domain.Messages.Message
        {
            Id = Guid.NewGuid(),
            SenderId = actorId,
            RecipientId = recipient,
            ListingId = o.ListingId,
            Content = card,
            Kind = "offer",
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync(ct);
    }

    // ---- helpers ----

    private static Offer NewOffer(Guid listingId, Guid sellerId, Guid buyerId, Guid createdById, decimal amount, Guid? counterToId = null) =>
        new()
        {
            Id = Guid.NewGuid(),
            ListingId = listingId,
            BuyerId = buyerId,
            SellerId = sellerId,
            CreatedById = createdById,
            Amount = Math.Round(amount, 2),
            Status = OfferStatus.Pending,
            CounterToId = counterToId,
            ExpiresAt = DateTime.UtcNow.Add(OfferLifetime),
        };

    private async Task<Offer> GetOfferAsync(Guid id, CancellationToken ct) =>
        await db.Offers.FirstAsync(o => o.Id == id, ct);

    private static void EnsureParticipant(Offer offer, Guid actorId)
    {
        if (actorId != offer.SellerId && actorId != offer.BuyerId)
            throw new UnauthorizedAccessException("You are not part of this negotiation.");
    }

    private static Task EnsureAwaitingAsync(Offer offer, CancellationToken ct)
    {
        if (offer.Status != OfferStatus.Pending || offer.ExpiresAt <= DateTime.UtcNow)
            throw new InvalidOperationException("This offer is no longer active.");
        return Task.CompletedTask;
    }

    private async Task<int> ChainDepthAsync(Offer offer, CancellationToken ct)
    {
        var depth = 1;
        var cursor = offer.CounterToId;
        while (cursor is not null && depth < MaxChainDepth + 2)
        {
            var parent = await db.Offers.AsNoTracking().FirstAsync(o => o.Id == cursor, ct);
            cursor = parent.CounterToId;
            depth++;
        }
        return depth;
    }

    private async Task<OfferDto> ToDtoAsync(Offer o, string viewerRole, CancellationToken ct)
    {
        var listing = await db.Listings.AsNoTracking()
            .Where(l => l.Id == o.ListingId)
            .Select(l => new { l.Title, l.Price, l.ImageUrl })
            .FirstAsync(ct);

        var viewerId = viewerRole == "seller" ? o.SellerId : o.BuyerId;
        return new OfferDto(
            o.Id,
            o.ListingId,
            listing.Title,
            listing.Price,
            listing.ImageUrl,
            o.Amount,
            o.Status.ToString().ToLowerInvariant(),
            viewerRole,
            o.Status == OfferStatus.Pending && o.CreatedById != viewerId,
            o.CreatedAt,
            o.ExpiresAt);
    }

    private async Task<OrderDto> BuildOrderDtoAsync(Domain.Orders.Order order, string role)
    {
        var listing = await db.Listings.AsNoTracking()
            .Where(l => l.Id == order.ListingId)
            .Select(l => new { l.Title, l.ImageUrl })
            .FirstAsync();

        return new OrderDto(
            order.Id,
            order.ListingId,
            listing.Title,
            listing.ImageUrl,
            order.Price,
            "pending_payment",
            role,
            order.ShippingAddress,
            order.TrackingNumber,
            order.CreatedAt,
            false,
            order.PaidAt,
            order.ShippedAt,
            order.DeliveredAt);
    }
}
