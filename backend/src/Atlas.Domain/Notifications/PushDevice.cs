namespace Atlas.Domain.Notifications;

/// <summary>A phone that receives push alerts for one user, by its Expo push token.</summary>
public class PushDevice
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Token { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty; // ios | android
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastSeenAt { get; set; } = DateTime.UtcNow;
    /// <summary>Set when Expo reports the token as no longer registered; the worker skips disabled phones.</summary>
    public DateTime? DisabledAt { get; set; }
}
