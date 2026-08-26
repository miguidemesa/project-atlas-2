using Atlas.Domain.Wallet;
using Atlas.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Atlas.Infrastructure.Payouts;

public sealed record PayoutDto(
    Guid Id, Guid UserId, decimal Amount, string Method, string Destination,
    string Status, string? AdminNote, DateTime CreatedAt);

public sealed class PayoutException(string message) : Exception(message);

public interface IPayoutService
{
    Task<PayoutDto> RequestAsync(Guid userId, decimal amount, string method, string destination, CancellationToken ct = default);
    Task<IReadOnlyList<PayoutDto>> MineAsync(Guid userId, CancellationToken ct = default);
    Task<IReadOnlyList<PayoutDto>> PendingAsync(CancellationToken ct = default);
    Task<PayoutDto> ApproveAsync(Guid payoutId, Guid adminId, CancellationToken ct = default);
    Task<PayoutDto> RejectAsync(Guid payoutId, Guid adminId, string note, CancellationToken ct = default);
}

/// <summary>
/// Withdrawals from the seller wallet, queued for manual settlement
/// (GCash/bank transfer by ops). Approval debits the wallet atomically.
/// </summary>
public sealed class PayoutService(AtlasDbContext db) : IPayoutService
{
    private const decimal MinPayout = 500m;

    public async Task<PayoutDto> RequestAsync(Guid userId, decimal amount, string method, string destination, CancellationToken ct = default)
    {
        if (amount < MinPayout)
            throw new PayoutException($"Minimum payout is ₱{MinPayout:0}.");
        if (method is not ("gcash" or "bank"))
            throw new PayoutException("Choose GCash or bank transfer.");
        if (string.IsNullOrWhiteSpace(destination) || destination.Trim().Length < 8)
            throw new PayoutException("Enter your GCash number or bank account details.");

        var balance = await db.WalletEntries.Where(w => w.UserId == userId).SumAsync(w => (decimal?)w.Delta, ct) ?? 0;
        if (amount > balance)
            throw new PayoutException($"Available balance is only ₱{balance:0}.");

        var pr = new PayoutRequest
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Amount = amount,
            Method = method,
            Destination = destination.Trim(),
            Status = "pending",
            CreatedAt = DateTime.UtcNow,
        };
        db.PayoutRequests.Add(pr);
        await db.SaveChangesAsync(ct);
        return ToDto(pr);
    }

    public async Task<IReadOnlyList<PayoutDto>> MineAsync(Guid userId, CancellationToken ct = default) =>
        (await Query()).Where(p => p.UserId == userId).ToList();

    public async Task<IReadOnlyList<PayoutDto>> PendingAsync(CancellationToken ct = default) =>
        (await Query()).Where(p => p.Status == "pending").OrderBy(p => p.CreatedAt).ToList();

    public async Task<PayoutDto> ApproveAsync(Guid payoutId, Guid adminId, CancellationToken ct = default)
    {
        var pr = await GetPendingAsync(payoutId, ct);
        var balance = await db.WalletEntries.Where(w => w.UserId == pr.UserId).SumAsync(w => (decimal?)w.Delta, ct) ?? 0;
        if (pr.Amount > balance)
            throw new PayoutException($"Seller balance ₱{balance:0} can't cover this payout.");

        pr.Status = "paid";
        pr.ProcessedAt = DateTime.UtcNow;
        pr.AdminNote = $"approved by admin {adminId.ToString()[..8]}";
        db.WalletEntries.Add(new WalletEntry
        {
            Id = Guid.NewGuid(), UserId = pr.UserId, Delta = -pr.Amount,
            Kind = "payout", CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync(ct);
        return ToDto(pr);
    }

    public async Task<PayoutDto> RejectAsync(Guid payoutId, Guid adminId, string note, CancellationToken ct = default)
    {
        var pr = await GetPendingAsync(payoutId, ct);
        pr.Status = "rejected";
        pr.AdminNote = note?.Trim();
        pr.ProcessedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return ToDto(pr);
    }

    private async Task<PayoutRequest> GetPendingAsync(Guid id, CancellationToken ct)
    {
        var pr = await db.PayoutRequests.FirstAsync(p => p.Id == id, ct);
        if (pr.Status != "pending") throw new PayoutException("Already processed.");
        return pr;
    }

    private async Task<List<PayoutDto>> Query() =>
        await db.PayoutRequests.AsNoTracking()
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => ToDto(p))
            .ToListAsync();

    private static PayoutDto ToDto(PayoutRequest p) =>
        new(p.Id, p.UserId, p.Amount, p.Method, p.Destination, p.Status, p.AdminNote, p.CreatedAt);
}
