using System.Security.Cryptography;
using Atlas.Domain.Orders;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Atlas.Infrastructure.Payments;

public sealed record CheckoutInfo(string Url, string SessionId);

public interface IPaymentProvider
{
    string Name { get; }

    /// <summary>
    /// Creates hosted checkout for an order. Returns session id + hosted URL,
    /// or null when capture is internal (mock/dev).
    /// </summary>
    Task<CheckoutInfo?> StartCheckoutAsync(Guid orderId, decimal pricePhp, CancellationToken ct = default);

    /// <summary>PSP-side status of a checkout session: "paid" | "pending" | …</summary>
    Task<string?> GetCheckoutStatusAsync(string sessionId, CancellationToken ct = default);
}

/// <summary>
/// DEV ONLY. Captures instantly so the order lifecycle runs without PSP
/// credentials. Never enabled in production.
/// </summary>
public sealed class MockPaymentProvider : IPaymentProvider
{
    public string Name => "mock";
    public Task<CheckoutInfo?> StartCheckoutAsync(Guid orderId, decimal pricePhp, CancellationToken ct = default)
        => Task.FromResult<CheckoutInfo?>(null);

    public Task<string?> GetCheckoutStatusAsync(string sessionId, CancellationToken ct = default)
        => Task.FromResult<string?>("paid");
}

/// <summary>PayMongo Checkout Sessions — GCash / cards, PHP.</summary>
public sealed class PayMongoProvider(HttpClient http, IConfiguration config, ILogger<PayMongoProvider> logger) : IPaymentProvider
{
    public string Name => "paymongo";

    private string SecretKey => config["Payments:PayMongo:SecretKey"]
        ?? throw new InvalidOperationException("Payments:PayMongo:SecretKey is not configured.");

    public async Task<CheckoutInfo?> StartCheckoutAsync(Guid orderId, decimal pricePhp, CancellationToken ct = default)
    {
        var payload = new
        {
            data = new
            {
                attributes = new
                {
                    send_email_receipt = true,
                    show_line_items = true,
                    line_items = new[]
                    {
                        new
                        {
                            name = $"Atlas order {orderId.ToString()[..8]}",
                            amount = (int)(pricePhp * 100),
                            currency = "PHP",
                            quantity = 1,
                        },
                    },
                    payment_method_types = new[] { "gcash", "card" },
                    success_url = config["Payments:SuccessUrl"] ?? "http://localhost:3001/orders",
                    cancel_url = config["Payments:CancelUrl"] ?? "http://localhost:3001/orders",
                    reference_number = orderId.ToString(),
                },
            },
        };

        using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.paymongo.com/v1/checkout_sessions");
        req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic",
            Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"{SecretKey}:")));
        req.Content = new StringContent(System.Text.Json.JsonSerializer.Serialize(payload),
            System.Text.Encoding.UTF8, "application/json");

        using var res = await http.SendAsync(req, ct);
        if (!res.IsSuccessStatusCode)
        {
            logger.LogError("PayMongo checkout failed: {Status} {Body}", (int)res.StatusCode,
                await res.Content.ReadAsStringAsync(ct));
            throw new InvalidOperationException("Payment gateway rejected the request.");
        }

        using var doc = await System.Text.Json.JsonDocument.ParseAsync(await res.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
        var data = doc.RootElement.GetProperty("data");
        return new CheckoutInfo(
            Url: data.GetProperty("attributes").GetProperty("checkout_url").GetString()!,
            SessionId: data.GetProperty("id").GetString()!);
    }

    public async Task<string?> GetCheckoutStatusAsync(string sessionId, CancellationToken ct = default)
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, $"https://api.paymongo.com/v1/checkout_sessions/{sessionId}");
        req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic",
            Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"{SecretKey}:")));

        using var res = await http.SendAsync(req, ct);
        if (!res.IsSuccessStatusCode)
        {
            logger.LogWarning("PayMongo session lookup failed: {Status}", (int)res.StatusCode);
            return null;
        }

        using var doc = await System.Text.Json.JsonDocument.ParseAsync(await res.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
        return doc.RootElement.GetProperty("data").GetProperty("attributes").GetProperty("status").GetString();
    }
}

public static class PayMongoSignatureVerifier
{
    /// <summary>
    /// Validates PayMongo's Paymongo-Signature header:
    ///   t=&lt;unix_ts&gt;,li=...,signature=&lt;hex hmac of t + '.' + rawBody&gt;
    /// Rejects replays older than 5 minutes. Constant-time comparison.
    /// </summary>
    public static bool Verify(string secret, string header, string rawBody, DateTimeOffset now)
    {
        if (string.IsNullOrWhiteSpace(header)) return false;

        string? timestamp = null, signature = null;
        foreach (var part in header.Split(','))
        {
            var kv = part.Split('=', 2);
            if (kv.Length != 2) continue;
            if (kv[0].Trim() == "t") timestamp = kv[1].Trim();
            if (kv[0].Trim() == "signature" || kv[0].Trim() == "v2") signature = kv[1].Trim();
        }
        if (timestamp is null || signature is null) return false;

        if (!long.TryParse(timestamp, out var ts) || Math.Abs(now.ToUnixTimeSeconds() - ts) > 300)
            return false;

        var expected = Convert.ToHexString(
            new HMACSHA256(System.Text.Encoding.UTF8.GetBytes(secret))
                .ComputeHash(System.Text.Encoding.UTF8.GetBytes($"{timestamp}.{rawBody}")));

        return CryptographicOperations.FixedTimeEquals(
            System.Text.Encoding.UTF8.GetBytes(expected.ToLowerInvariant()),
            System.Text.Encoding.UTF8.GetBytes(signature.ToLowerInvariant()));
    }
}
