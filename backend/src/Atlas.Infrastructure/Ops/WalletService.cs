using Atlas.Domain.Disputes;
using Atlas.Domain.Wallet;
using Atlas.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Atlas.Infrastructure.Ops;

public sealed record WalletDto(decimal Balance, IReadOnlyList<WalletEntryDto> History);
public sealed record WalletEntryDto(Guid Id, decimal Delta, string Kind, Guid? OrderId, DateTime CreatedAt);

public interface IWalletService
{
    Task<WalletDto> SummaryAsync(Guid userId, CancellationToken ct = default);
    Task<decimal> BalanceAsync(Guid userId, CancellationToken ct = default);
}

/// <summary>
/// Credit-only peso wallet: sale credits on delivery confirmation,
/// refund credits on dispute resolution, debits from approved payouts.
/// No top-ups by design (regulatory posture).
/// </summary>
public sealed class WalletService(AtlasDbContext db) : IWalletService
{
    public async Task<WalletDto> SummaryAsync(Guid userId, CancellationToken ct = default)
    {
        var history = await db.WalletEntries.AsNoTracking()
            .Where(w => w.UserId == userId)
            .OrderByDescending(w => w.CreatedAt)
            .Take(30)
            .Select(w => new WalletEntryDto(w.Id, w.Delta, w.Kind, w.OrderId, w.CreatedAt))
            .ToListAsync(ct);
        return new WalletDto(await BalanceAsync(userId, ct), history);
    }

    public async Task<decimal> BalanceAsync(Guid userId, CancellationToken ct = default) =>
        await db.WalletEntries.AsNoTracking()
            .Where(w => w.UserId == userId)
            .SumAsync(w => (decimal?)w.Delta, ct) ?? 0m;
}
