namespace Atlas.Domain.Notifications;

/// <summary>A user's push choice for one category. No row means push is on.</summary>
public class NotificationPreference
{
    public Guid UserId { get; set; }
    public NotificationCategory Category { get; set; }
    public bool PushEnabled { get; set; } = true;
}
