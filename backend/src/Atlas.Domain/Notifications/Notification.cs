namespace Atlas.Domain.Notifications;

/// <summary>
/// An in-app notification (P4's bell lists these). NotificationService marks it for push when the user
/// allows its category; PushWorker sends it.
/// </summary>
public class Notification
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public NotificationCategory Category { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    /// <summary>The atlas:// link a tap opens.</summary>
    public string Url { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }
    public PushStatus PushStatus { get; set; } = PushStatus.None;
    public int PushAttempts { get; set; }
    public DateTime? PushNextAttemptAt { get; set; }
}
