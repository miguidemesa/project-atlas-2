namespace Atlas.Domain.Notifications;

/// <summary>The API's names for <see cref="NotificationCategory"/>: "bids", "orders", "offers", "following", "announcements".</summary>
public static class NotificationCategories
{
    public static string Slug(NotificationCategory category) => category.ToString().ToLowerInvariant();

    /// <summary>Matches the lowercase names only, so "1" or "Bids" never parse.</summary>
    public static bool TryParse(string? slug, out NotificationCategory category)
    {
        foreach (var value in Enum.GetValues<NotificationCategory>())
        {
            if (Slug(value) == slug)
            {
                category = value;
                return true;
            }
        }
        category = default;
        return false;
    }
}
