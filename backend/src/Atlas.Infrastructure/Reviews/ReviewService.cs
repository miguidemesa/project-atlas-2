using Atlas.Domain.Orders;
using Atlas.Domain.Reviews;
using Atlas.Application.Rewards;
using Atlas.Domain.Rewards;
using Atlas.Infrastructure.Persistence;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;

namespace Atlas.Infrastructure.Reviews;

public sealed record ReviewDto(Guid Id, int Rating, string? Content, string ReviewerMasked, DateTime CreatedAt);
public sealed record SellerReviewsDto(decimal Avg, int Count, IReadOnlyList<ReviewDto> Items);

public interface IReviewService
{
    /// <summary>Posts a review on a completed order. Rules 6–8 enforced.</summary>
    Task<ReviewDto> PostAsync(Guid orderId, Guid actorId, int rating, string? content, CancellationToken ct = default);
    Task<SellerReviewsDto> ForSellerAsync(Guid sellerId, CancellationToken ct = default);
}

public sealed class ReviewService(AtlasDbContext db, IConfiguration config) : IReviewService
{
    public async Task<ReviewDto> PostAsync(Guid orderId, Guid actorId, int rating, string? content, CancellationToken ct = default)
    {
        if (rating is < 1 or > 5)
            throw new ArgumentException("Rating must be between 1 and 5.");

        var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == orderId, ct)
            ?? throw new KeyNotFoundException("Order not found.");

        if (order.Status != OrderStatus.FundsReleased)
            throw new InvalidOperationException("Reviews unlock after delivery is confirmed."); // rule 6

        var isBuyer = order.BuyerId == actorId;
        var isSeller = order.SellerId == actorId;
        if (!isBuyer && !isSeller)
            throw new UnauthorizedAccessException(); // rule 6: participants only

        var reviewee = isBuyer ? order.SellerId : order.BuyerId;

        var already = await db.Reviews.AnyAsync(r => r.OrderId == orderId && r.ReviewerId == actorId, ct);
        if (already)
            throw new InvalidOperationException("You already reviewed this order."); // rule 7 support

        var review = new Review
        {
            Id = Guid.NewGuid(),
            OrderId = orderId,
            ReviewerId = actorId,
            RevieweeId = reviewee,
            Rating = rating,
            Content = string.IsNullOrWhiteSpace(content) ? null : content.Trim()[..Math.Min(1000, content.Trim().Length)],
            CreatedAt = DateTime.UtcNow,
        };
        db.Reviews.Add(review);

        // ratings are computed server-side only — rule 8
        var profile = await db.SellerProfiles.FirstOrDefaultAsync(p => p.UserId == reviewee, ct);
        if (profile is not null)
        {
            var stats = await db.Reviews.Where(r => r.RevieweeId == reviewee)
                .GroupBy(_ => 1)
                .Select(g => new { Avg = (decimal)g.Average(x => x.Rating), Count = g.Count() })
                .FirstOrDefaultAsync(ct);
            profile.RatingAvg = Math.Round(stats?.Avg ?? rating, 2);
            profile.RatingCount = profile.RatingCount + 1;
            profile.VerificationBadge |= false;
        }

        db.PointsLedger.Add(new PointsLedger
        {
            Id = Guid.NewGuid(),
            UserId = actorId,
            Delta = Application.Rewards.RewardsMath.ReviewBonus,
            Kind = "earn_review",
            OrderId = orderId,
            ExpiresAt = DateTime.UtcNow.AddDays(365),
        });
        await db.SaveChangesAsync(ct);

        var reviewer = await db.Users.AsNoTracking().FirstAsync(u => u.Id == actorId, ct);
        return new ReviewDto(review.Id, review.Rating, review.Content, Mask(reviewer.Name), review.CreatedAt);
    }

    public async Task<SellerReviewsDto> ForSellerAsync(Guid sellerId, CancellationToken ct = default)
    {
        var items = await db.Reviews.AsNoTracking()
            .Where(r => r.RevieweeId == sellerId)
            .OrderByDescending(r => r.CreatedAt)
            .Take(20)
            .Join(db.Users.AsNoTracking(),
                r => r.ReviewerId,
                u => u.Id,
                (r, u) => new ReviewDto(r.Id, r.Rating, r.Content, Mask(u.Name), r.CreatedAt))
            .ToListAsync(ct);

        var avg = items.Count == 0 ? 0m : Math.Round(items.Average(i => (decimal)i.Rating), 1);
        return new SellerReviewsDto(avg, items.Count, items);
    }

    private static string Mask(string name)
    {
        var parts = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var first = parts[0];
        return $"{first[0]}{new string('*', Math.Max(2, first.Length - 1))}";
    }
}
