namespace Atlas.Infrastructure.Notifications;

/// <summary>Configuration section "Push".</summary>
public sealed class PushOptions
{
    public const string Section = "Push";

    /// <summary>Tests turn the worker off, so nothing reaches Expo's real service.</summary>
    public bool WorkerEnabled { get; set; } = true;

    public TimeSpan PollInterval { get; set; } = TimeSpan.FromSeconds(5);

    public string ExpoBaseUrl { get; set; } = "https://exp.host";

    /// <summary>Tries before a push is marked Failed; the waits between them are 30s, 1m, 2m and 4m.</summary>
    public int MaxAttempts { get; set; } = 5;
}
