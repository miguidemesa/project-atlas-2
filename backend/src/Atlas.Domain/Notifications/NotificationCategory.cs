namespace Atlas.Domain.Notifications;

/// <summary>Alert kinds people can turn push on or off for. The app makes one Android channel per value.</summary>
public enum NotificationCategory
{
    Bids,
    Orders,
    Offers,
    Following,
    Announcements,
}
