namespace Atlas.Application.Common.Interfaces;

/// <summary>
/// Sends transactional emails. Implementations: Resend (production),
/// Console (dev). Keys stay server-side only.
/// </summary>
public interface IEmailSender
{
    /// <summary>Sends an email. Fire-and-forget safe; failures are logged not thrown.</summary>
    Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct = default);
}
