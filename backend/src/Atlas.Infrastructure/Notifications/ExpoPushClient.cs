using System.Net.Http.Json;
using System.Text.Json;

namespace Atlas.Infrastructure.Notifications;

/// <summary>One message for Expo's push service (https://docs.expo.dev/push-notifications/sending-notifications/).</summary>
public sealed record ExpoMessage(string To, string Title, string Body, string ChannelId, IReadOnlyDictionary<string, string> Data)
{
    public string Sound { get; init; } = "default";
}

public sealed record ExpoTicketDetails(string? Error);

/// <summary>Expo's answer for one message, in the order the messages were sent.</summary>
public sealed record ExpoTicket(string Status, string? Message, ExpoTicketDetails? Details)
{
    public bool Ok => Status == "ok";
    public bool DeviceNotRegistered => Details?.Error == "DeviceNotRegistered";
}

/// <summary>Expo didn't take a batch. Temporary failures (network, timeouts, unreadable answers, 429, 5xx) are retried later.</summary>
public sealed class ExpoPushException(string message, bool temporary) : Exception(message)
{
    public bool Temporary { get; } = temporary;
}

/// <summary>Sends batches to Expo's push API. The HttpClient is injected, so tests replace Expo with a fake handler.</summary>
public sealed class ExpoPushClient(HttpClient http)
{
    /// <summary>Expo accepts up to 100 messages per request.</summary>
    public const int MaxBatch = 100;

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private sealed record TicketResponse(IReadOnlyList<ExpoTicket>? Data);

    // ponytail: tickets only; DeviceNotRegistered that Expo learns later appears in receipts (getReceipts after ~15 min). Poll receipts when delivery tracking matters.
    public async Task<IReadOnlyList<ExpoTicket>> SendAsync(IReadOnlyList<ExpoMessage> messages, CancellationToken ct)
    {
        HttpResponseMessage res;
        try
        {
            res = await http.PostAsJsonAsync("/--/api/v2/push/send", messages, Json, ct);
        }
        catch (HttpRequestException e)
        {
            throw new ExpoPushException($"Couldn't reach Expo: {e.Message}", temporary: true);
        }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested)
        {
            throw new ExpoPushException("Expo didn't answer in time.", temporary: true);
        }

        using (res)
        {
            if (!res.IsSuccessStatusCode)
            {
                var code = (int)res.StatusCode;
                throw new ExpoPushException($"Expo answered {code}.", temporary: code == 429 || code >= 500);
            }
            try
            {
                return (await res.Content.ReadFromJsonAsync<TicketResponse>(Json, ct))?.Data ?? [];
            }
            catch (JsonException)
            {
                throw new ExpoPushException("Expo sent an answer Atlas couldn't read.", temporary: true);
            }
        }
    }
}
