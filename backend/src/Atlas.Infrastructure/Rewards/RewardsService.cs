using Atlas.Domain.Rewards;

using Atlas.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Atlas.Infrastructure.Rewards;

public sealed record RewardHistoryDto(Guid Id, int Delta, string Kind, DateTime CreatedAt);

public interface IRewardsService
{
    Task<int> BalanceAsync(Guid userId, CancellationToken ct = default);
    Task<(int Balance, IReadOnlyList<RewardHistoryDto> History)> SummaryAsync(Guid userId, CancellationToken ct = default);
}

/// <summary>
/// Loyalty ledger. Earn rows expire after 12 months; redemption rows are
/// negative and permanent. Balances are always computed from the ledger.
/// </summary>
public sealed class RewardsService(AtlasDbContext db, IConfiguration config) : IRewardsService
{
    public async Task<int> BalanceAsync(Guid userId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var earned = await db.PointsLedger
            .Where(p => p.UserId == userId && p.Delta > 0 && (p.ExpiresAt == null || p.ExpiresAt > now))
            .SumAsync(p => p.Delta, ct);
        var spent = await db.PointsLedger
            .Where(p => p.UserId == userId && p.Delta < 0)
            .SumAsync(p => p.Delta, ct);
        return Math.Max(0, earned + spent);
    }

    public async Task<(int Balance, IReadOnlyList<RewardHistoryDto> History)> SummaryAsync(Guid userId, CancellationToken ct = default)
    {
        var balance = await BalanceAsync(userId, ct);
        var history = await db.PointsLedger.AsNoTracking()
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .Take(20)
            .Select(p => new RewardHistoryDto(p.Id, p.Delta, p.Kind, p.CreatedAt))
            .ToListAsync(ct);
        return (balance, history);
    }
}
