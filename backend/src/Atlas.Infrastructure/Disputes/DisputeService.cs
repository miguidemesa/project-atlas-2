using Atlas.Domain.Disputes;
using Atlas.Domain.Orders;
using Atlas.Domain.Wallet;
using Atlas.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Atlas.Infrastructure.Disputes;

public sealed record DisputeDto(
    Guid Id, Guid OrderId, string OrderTitle, decimal OrderPrice,
    Guid OpenedBy, string Status,
    string Reason, string? ResolutionNote, DateTime CreatedAt);

public sealed class DisputeException(string message) : Exception(message);

public interface IDisputeService
{
    Task<DisputeDto> OpenAsync(Guid orderId, Guid userId, string reason, CancellationToken ct = default);
    Task<IReadOnlyList<DisputeDto>> MineAsync(Guid userId, CancellationToken ct = default);
    Task<IReadOnlyList<DisputeDto>> ByStatusAsync(string status, CancellationToken ct = default);
    /// <summary>Admin resolution. outcome: "refund_buyer" | "release_seller".</summary>
    Task ResolveAsync(Guid disputeId, string outcome, string? note, CancellationToken ct = default);
}

/// <summary>
/// Disputes pause the order (status → Disputed). Admin resolution either
/// refunds the buyer into wallet credit or releases funds to the seller.
/// </summary>
public sealed class DisputeService(AtlasDbContext db) : IDisputeService
{
    public async Task<DisputeDto> OpenAsync(Guid orderId, Guid userId, string reason, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(reason) || reason.Trim().Length < 15)
            throw new DisputeException("Describe the issue in at least 15 characters.");

        var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == orderId, ct)
            ?? throw new KeyNotFoundException("Order not found.");
        if (order.BuyerId != userId && order.SellerId != userId)
            throw new UnauthorizedAccessException();
        if (order.Status is not (OrderStatus.PaidAwaitingShipment or OrderStatus.Shipped or OrderStatus.FundsReleased))
            throw new DisputeException("This order can't be disputed at its current stage.");
        if (await db.Disputes.AnyAsync(d => d.OrderId == orderId && d.Status == "open", ct))
            throw new DisputeException("A dispute is already open for this order.");

        var dispute = NewDispute(orderId, userId, reason);
        db.Disputes.Add(dispute);
        order.Status = OrderStatus.Disputed;
        order.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return await BuildDto(dispute, ct);
    }

    public async Task<IReadOnlyList<DisputeDto>> MineAsync(Guid userId, CancellationToken ct = default) =>
        await Projected(d => d.OpenedBy == userId);

    public async Task<IReadOnlyList<DisputeDto>> ByStatusAsync(string status, CancellationToken ct = default) =>
        await Projected(d => d.Status == status);

    public async Task ResolveAsync(Guid disputeId, string outcome, string? note, CancellationToken ct = default)
    {
        if (outcome is not ("refund_buyer" or "release_seller"))
            throw new DisputeException("Outcome must be refund_buyer or release_seller.");

        var dispute = await db.Disputes.FirstAsync(d => d.Id == disputeId, ct);
        if (dispute.Status != "open") throw new DisputeException("Already resolved.");

        var order = await db.Orders.FirstAsync(o => o.Id == dispute.OrderId, ct);

        if (outcome == "refund_buyer")
        {
            order.Status = OrderStatus.Refunded;
            db.WalletEntries.Add(new WalletEntry
            {
                Id = Guid.NewGuid(), UserId = order.BuyerId,
                Delta = order.Price, Kind = "refund", OrderId = order.Id,
                CreatedAt = DateTime.UtcNow,
            });
        }
        else
        {
            order.Status = OrderStatus.FundsReleased; // seller keeps the money
        }

        dispute.Status = outcome == "refund_buyer" ? "resolved_refund" : "resolved_release";
        dispute.ResolutionNote = note?.Trim();
        dispute.ResolvedAt = DateTime.UtcNow;
        order.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    private static Dispute NewDispute(Guid orderId, Guid openedBy, string reason) =>
        new()
        {
            Id = Guid.NewGuid(),
            OrderId = orderId,
            OpenedBy = openedBy,
            Reason = reason.Trim(),
            Status = "open",
            CreatedAt = DateTime.UtcNow,
        };

    private async Task<List<DisputeDto>> Projected(System.Linq.Expressions.Expression<Func<Dispute, bool>> predicate)
    {
        var disputes = await db.Disputes.AsNoTracking()
            .Where(predicate)
            .OrderByDescending(d => d.CreatedAt)
            .Take(50)
            .ToListAsync();

        var orderIds = disputes.Select(d => d.OrderId).Distinct().ToList();
        var orderInfo = await db.Orders.AsNoTracking()
            .Where(o => orderIds.Contains(o.Id))
            .Join(db.Listings.AsNoTracking(), o => o.ListingId, l => l.Id,
                (o, l) => new { o.Id, o.Price, l.Title })
            .ToDictionaryAsync(x => x.Id);

        return disputes.Select(d =>
        {
            orderInfo.TryGetValue(d.OrderId, out var info);
            return new DisputeDto(
                d.Id, d.OrderId, info?.Title ?? "(listing removed)", info?.Price ?? 0m,
                d.OpenedBy, d.Status, d.Reason, d.ResolutionNote, d.CreatedAt);
        }).ToList();
    }

    private async Task<DisputeDto> BuildDto(Dispute d, CancellationToken ct)
    {
        var info = await db.Orders.AsNoTracking()
            .Where(o => o.Id == d.OrderId)
            .Join(db.Listings.AsNoTracking(), o => o.ListingId, l => l.Id,
                (o, l) => new { o.Price, l.Title })
            .FirstAsync(ct);
        return new DisputeDto(
            d.Id, d.OrderId, info.Title, info.Price, d.OpenedBy,
            d.Status, d.Reason, d.ResolutionNote, d.CreatedAt);
    }
}
