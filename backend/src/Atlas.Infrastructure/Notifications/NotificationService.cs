using Atlas.Domain.Notifications;
using Atlas.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Atlas.Infrastructure.Notifications;

/// <summary>
/// The one entry point for alerts. It always writes an in-app notification (P4's bell lists them) and marks
/// it for push when the user allows that category. It never sends: PushWorker does, outside the request
/// that raised the alert. Copy carries nothing beyond the user's own activity.
/// </summary>
public sealed class NotificationService(AtlasDbContext db)
{
    public async Task<Notification> NotifyAsync(
        Guid userId, NotificationCategory category, string title, string body, string url, CancellationToken ct)
    {
        var pushOff = await db.NotificationPreferences
            .AnyAsync(p => p.UserId == userId && p.Category == category && !p.PushEnabled, ct);
        var now = DateTime.UtcNow;
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Category = category,
            Title = title,
            Body = body,
            Url = url,
            CreatedAt = now,
            PushStatus = pushOff ? PushStatus.None : PushStatus.Pending,
            PushNextAttemptAt = pushOff ? null : now,
        };
        db.Notifications.Add(notification);
        await db.SaveChangesAsync(ct);
        return notification;
    }
}
