using System.Globalization;
using Atlas.Domain.Listings;
using Atlas.Domain.Offers;
using Atlas.Domain.Orders;
using Atlas.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Atlas.Infrastructure.Accounts;

/// <summary>
/// In-app account deletion. Refused while money or a commitment is still open; otherwise the account is
/// anonymized, and completed orders and reviews stay under "Deleted user" for the other party's records.
/// </summary>
public sealed class AccountDeletion(AtlasDbContext db)
{
    public const string AnonymousName = "Deleted user";

    /// <summary>What the user must finish first, in plain English. Empty when nothing blocks deletion.</summary>
    public async Task<IReadOnlyList<string>> BlockersAsync(Guid userId, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var blockers = new List<string>();

        var disputes = await db.Disputes.CountAsync(d => d.Status == "open"
            && db.Orders.Any(o => o.Id == d.OrderId && (o.BuyerId == userId || o.SellerId == userId)), ct);
        if (disputes > 0)
            blockers.Add(disputes == 1 ? "wait for your open dispute to be resolved" : $"wait for your {disputes} open disputes to be resolved");

        var orders = await db.Orders.CountAsync(o => (o.BuyerId == userId || o.SellerId == userId)
            && (o.Status == OrderStatus.PendingPayment || o.Status == OrderStatus.PaidAwaitingShipment
                || o.Status == OrderStatus.Shipped || o.Status == OrderStatus.DeliveredConfirmed
                || o.Status == OrderStatus.Disputed), ct);
        if (orders > 0)
            blockers.Add(orders == 1 ? "finish your open order" : $"finish your {orders} open orders");

        var winning = await db.Auctions.CountAsync(a => a.CurrentBidderId == userId && a.EndTime > now
            && db.Listings.Any(l => l.Id == a.ListingId && l.Status == ListingStatus.Active), ct);
        if (winning > 0)
            blockers.Add(winning == 1 ? "wait for the auction you're winning to end" : $"wait for the {winning} auctions you're winning to end");

        var balance = await db.WalletEntries.Where(w => w.UserId == userId).SumAsync(w => (decimal?)w.Delta, ct) ?? 0m;
        var pendingPayouts = await db.PayoutRequests.Where(p => p.UserId == userId && p.Status == "pending")
            .SumAsync(p => (decimal?)p.Amount, ct) ?? 0m;
        if (pendingPayouts > 0) blockers.Add("wait for your payout to be sent");
        var free = balance - pendingPayouts; // a pending payout is still in the balance until it's approved
        if (free > 0) blockers.Add($"withdraw your {Peso(free)} balance");

        return blockers;
    }

    public static string Explain(IReadOnlyList<string> blockers) =>
        $"Before you can delete your account, {JoinAnd(blockers)}.";

    /// <summary>Removes personal data and disables sign-in. Completed orders and reviews stay under "Deleted user".</summary>
    public async Task AnonymizeAsync(Guid userId, CancellationToken ct)
    {
        // ponytail: the blocker check and this write aren't serialized against a purchase made in the same instant; run both SERIALIZABLE if that race shows up
        // ponytail: access tokens already issued keep working until they expire (15 min); check the security stamp in JwtBearer OnTokenValidated if that window matters
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var now = DateTime.UtcNow;
        var placeholder = $"deleted-{userId:N}@deleted.invalid";

        var user = await db.Users.FirstAsync(u => u.Id == userId, ct);
        user.Name = AnonymousName;
        user.Email = placeholder;
        user.NormalizedEmail = placeholder.ToUpperInvariant();
        user.UserName = placeholder;
        user.NormalizedUserName = placeholder.ToUpperInvariant();
        user.EmailConfirmed = false;
        user.Phone = null;
        user.PhoneNumber = null;
        user.PhoneNumberConfirmed = false;
        user.PasswordHash = null;
        user.SecurityStamp = Guid.NewGuid().ToString();
        user.LockoutEnabled = true;
        user.LockoutEnd = DateTimeOffset.MaxValue;
        user.UpdatedAt = now;
        await db.SaveChangesAsync(ct);

        await db.SellerProfiles.Where(p => p.UserId == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.DisplayName, AnonymousName), ct);
        await db.RefreshTokens.Where(t => t.UserId == userId && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, now), ct);
        await db.PushDevices.Where(d => d.UserId == userId).ExecuteDeleteAsync(ct);
        await db.NotificationPreferences.Where(p => p.UserId == userId).ExecuteDeleteAsync(ct);
        await db.Notifications.Where(n => n.UserId == userId).ExecuteDeleteAsync(ct);
        await db.Orders.Where(o => o.BuyerId == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(o => o.ShippingAddress, (string?)null), ct);
        await db.PayoutRequests.Where(p => p.UserId == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.Destination, "removed"), ct);
        await db.Listings.Where(l => l.SellerId == userId && l.Status == ListingStatus.Active)
            .ExecuteUpdateAsync(s => s.SetProperty(l => l.Status, ListingStatus.Cancelled).SetProperty(l => l.UpdatedAt, now), ct);
        await db.Offers.Where(o => (o.BuyerId == userId || o.SellerId == userId) && o.Status == OfferStatus.Pending)
            .ExecuteUpdateAsync(s => s.SetProperty(o => o.Status, OfferStatus.Withdrawn).SetProperty(o => o.RespondedAt, now), ct);

        await tx.CommitAsync(ct);
    }

    private static string Peso(decimal amount) =>
        "₱" + amount.ToString(amount == decimal.Truncate(amount) ? "N0" : "N2", CultureInfo.InvariantCulture);

    private static string JoinAnd(IReadOnlyList<string> parts) => parts.Count switch
    {
        1 => parts[0],
        2 => $"{parts[0]} and {parts[1]}",
        _ => $"{string.Join(", ", parts.Take(parts.Count - 1))} and {parts[^1]}",
    };
}
