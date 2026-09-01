using Atlas.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;

namespace Atlas.Infrastructure.Notifications;

/// <summary>Dev fallback — logs email content instead of sending.</summary>
public sealed class ConsoleEmailSender(ILogger<ConsoleEmailSender> logger) : IEmailSender
{
    public async Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct = default)
    {
        logger.LogInformation("EMAIL [dev] → {To} | {Subject}", to, subject);
        await Task.CompletedTask;
    }
}
