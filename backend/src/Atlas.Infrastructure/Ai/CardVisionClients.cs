using Atlas.Application.Ai;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Atlas.Infrastructure.Ai;

/// <summary>
/// Dev fallback when no OpenAI key is configured: returns a clearly-flagged
/// sample identification so the scan UX stays demoable end-to-end.
/// </summary>
public sealed class MockCardVisionService : ICardVisionService
{
    public Task<CardScanResult> IdentifyAsync(string imageBase64, string contentType, CancellationToken ct = default)
        => Task.FromResult(new CardScanResult(
            Player: "Pikachu ex",
            Set: "Surging Sparks",
            Year: DateTime.UtcNow.Year - 1,
            Parallel: "Special Illustration Rare",
            Confidence: 0.97,
            IsMock: true));
}

/// <summary>
/// GPT-4o-mini vision identification. Prompts strictly for JSON and strips
/// markdown fences defensively.
/// </summary>
public sealed class OpenAiVisionClient(HttpClient http, IConfiguration config, ILogger<OpenAiVisionClient> logger) : ICardVisionService
{
    public async Task<CardScanResult> IdentifyAsync(string imageBase64, string contentType, CancellationToken ct = default)
    {
        var apiKey = config["OpenAI:ApiKey"];
        var model = config["Ai:VisionModel"] ?? "gpt-4o-mini";

        var payload = new
        {
            model,
            messages = new object[]
            {
                new
                {
                    role = "user",
                    content = new object[]
                    {
                        new
                        {
                            type = "text",
                            text = "Identify this trading card (any TCG or sports card). Respond ONLY with minified JSON: "
                                 + "{\"player\":\"character or athlete\",\"set\":\"set name\",\"year\":number,"
                                 + "\"parallel\":\"parallel or null\",\"confidence\":0.0-1.0}. "
                                 + "Use confidence 0 if you cannot identify it.",
                        },
                        new { type = "image_url", image_url = new { url = $"data:{contentType};base64,{imageBase64}" } },
                    },
                },
            },
            max_tokens = 200,
            response_format = new { type = "json_object" },
        };

        using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions");
        req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);
        req.Content = new StringContent(System.Text.Json.JsonSerializer.Serialize(payload),
            System.Text.Encoding.UTF8, "application/json");

        using var res = await http.SendAsync(req, ct);
        if (!res.IsSuccessStatusCode)
        {
            logger.LogWarning("Vision API failed: {Status}", (int)res.StatusCode);
            throw new InvalidOperationException("The card scanner is unavailable right now.");
        }

        using var doc = await System.Text.Json.JsonDocument.ParseAsync(await res.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
        var text = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString() ?? "{}";
        text = text.Trim();
        if (text.StartsWith("```"))
            text = string.Join('\n', text.Split('\n')[1..^1]).Trim();

        using var parsed = System.Text.Json.JsonDocument.Parse(text);
        var root = parsed.RootElement;
        int? year = root.TryGetProperty("year", out var y) && y.TryGetInt32(out var yy) ? yy : null;
        double conf = root.TryGetProperty("confidence", out var c) && c.TryGetDouble(out var cc) ? cc : 0;

        return new CardScanResult(
            Str(root, "player"),
            Str(root, "set"),
            year,
            Str(root, "parallel"),
            conf,
            IsMock: false);
    }

    private static string? Str(System.Text.Json.JsonElement el, string name) =>
        el.TryGetProperty(name, out var v) && v.ValueKind == System.Text.Json.JsonValueKind.String
            ? v.GetString()
            : null;
}
