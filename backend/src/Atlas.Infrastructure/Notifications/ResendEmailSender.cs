using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Atlas.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Atlas.Infrastructure.Notifications;

/// <summary>Sends via Resend (resend.com). Requires Notifications:Resend:ApiKey.</summary>
public sealed class ResendEmailSender(HttpClient http, IConfiguration config, ILogger<ResendEmailSender> logger) : IEmailSender
{
    public async Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct = default)
    {
        var apiKey = config["Notifications:Resend:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            logger.LogWarning("Resend API key not configured — email suppressed.");
            return;
        }

        var from = config["Notifications:FromEmail"] ?? "noreply@atlas.ph";
        var payload = new
        {
            from = $"Atlas <{from}>",
            to = new[] { to },
            subject,
            html = htmlBody,
        };

        using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        req.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        using var res = await http.SendAsync(req, ct);
        if (!res.IsSuccessStatusCode)
            logger.LogWarning("Resend failed ({Status}) for {To}: {Body}", (int)res.StatusCode, to,
                await res.Content.ReadAsStringAsync(ct));
    }
}
