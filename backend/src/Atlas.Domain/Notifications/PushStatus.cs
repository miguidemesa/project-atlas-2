namespace Atlas.Domain.Notifications;

/// <summary>Where a notification's push stands. The in-app notification exists in every state.</summary>
public enum PushStatus
{
    /// <summary>Not pushed: the category is off, or the user has no active phone.</summary>
    None,
    /// <summary>Waiting for PushWorker, at or after PushNextAttemptAt.</summary>
    Pending,
    Sent,
    /// <summary>Expo refused it, or it failed too many times.</summary>
    Failed,
}
