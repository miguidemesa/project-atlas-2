using Atlas.Domain.Notifications;
using Atlas.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Atlas.Infrastructure.Notifications;

/// <summary>
/// Sends notifications marked for push, in batches, through Expo. Temporary failures wait and retry;
/// tokens Expo reports as DeviceNotRegistered are disabled; a user with no active phone keeps the
/// in-app notification only.
/// </summary>
public sealed class PushSender(AtlasDbContext db, ExpoPushClient expo, IOptions<PushOptions> options, ILogger<PushSender> log)
{
    private const int DueBatch = 100;
    private static readonly TimeSpan FirstRetry = TimeSpan.FromSeconds(30);

    private sealed record Outgoing(Notification Notification, PushDevice Device, ExpoMessage Message);

    /// <summary>Sends everything due now and returns how many notifications it looked at.</summary>
    public async Task<int> SendDueAsync(CancellationToken ct)
    {
        // ponytail: one API instance runs one worker; claim rows with FOR UPDATE SKIP LOCKED before running several instances
        var now = DateTime.UtcNow;
        var due = await db.Notifications
            .Where(n => n.PushStatus == PushStatus.Pending && n.PushNextAttemptAt <= now)
            .OrderBy(n => n.CreatedAt)
            .Take(DueBatch)
            .ToListAsync(ct);
        if (due.Count == 0) return 0;

        var userIds = due.Select(n => n.UserId).Distinct().ToList();
        var devices = await db.PushDevices
            .Where(d => userIds.Contains(d.UserId) && d.DisabledAt == null)
            .ToListAsync(ct);

        foreach (var batch in Batches(due, devices))
            await SendBatchAsync(batch, ct);
        foreach (var notification in due.Where(n => devices.All(d => d.UserId != n.UserId)))
        {
            notification.PushStatus = PushStatus.None;
            notification.PushNextAttemptAt = null;
        }

        await db.SaveChangesAsync(ct);
        return due.Count;
    }

    /// <summary>Up to 100 messages per request, keeping each notification's messages in one request.</summary>
    private static IEnumerable<List<Outgoing>> Batches(List<Notification> due, List<PushDevice> devices)
    {
        var batch = new List<Outgoing>();
        foreach (var notification in due)
        {
            var messages = devices.Where(d => d.UserId == notification.UserId)
                .Select(d => new Outgoing(notification, d, ToMessage(notification, d)))
                .ToList();
            if (messages.Count == 0) continue;
            if (batch.Count > 0 && batch.Count + messages.Count > ExpoPushClient.MaxBatch)
            {
                yield return batch;
                batch = [];
            }
            batch.AddRange(messages);
        }
        if (batch.Count > 0) yield return batch;
    }

    private static ExpoMessage ToMessage(Notification n, PushDevice d) =>
        new(d.Token, n.Title, n.Body, NotificationCategories.Slug(n.Category), new Dictionary<string, string> { ["url"] = n.Url });

    private async Task SendBatchAsync(List<Outgoing> batch, CancellationToken ct)
    {
        var notifications = batch.Select(o => o.Notification).Distinct().ToList();
        IReadOnlyList<ExpoTicket> tickets;
        try
        {
            tickets = await expo.SendAsync(batch.Select(o => o.Message).ToList(), ct);
        }
        catch (ExpoPushException e)
        {
            log.LogWarning("Push batch of {Count} messages failed ({Kind}): {Message}",
                batch.Count, e.Temporary ? "will retry" : "permanent", e.Message);
            foreach (var notification in notifications) RetryOrFail(notification, e.Temporary);
            return;
        }

        var delivered = new HashSet<Guid>();
        for (var i = 0; i < batch.Count; i++)
        {
            var ticket = i < tickets.Count ? tickets[i] : null;
            if (ticket?.Ok == true)
                delivered.Add(batch[i].Notification.Id);
            else if (ticket?.DeviceNotRegistered == true)
                batch[i].Device.DisabledAt = DateTime.UtcNow;
            else
                log.LogWarning("Expo refused a push to device {DeviceId}: {Reason}", batch[i].Device.Id, ticket?.Message ?? "no ticket");
        }
        foreach (var notification in notifications)
        {
            notification.PushStatus = delivered.Contains(notification.Id) ? PushStatus.Sent : PushStatus.Failed;
            notification.PushNextAttemptAt = null;
        }
    }

    private void RetryOrFail(Notification notification, bool temporary)
    {
        notification.PushAttempts++;
        if (temporary && notification.PushAttempts < options.Value.MaxAttempts)
        {
            notification.PushNextAttemptAt = DateTime.UtcNow + FirstRetry * Math.Pow(2, notification.PushAttempts - 1);
            return;
        }
        notification.PushStatus = PushStatus.Failed;
        notification.PushNextAttemptAt = null;
    }
}
