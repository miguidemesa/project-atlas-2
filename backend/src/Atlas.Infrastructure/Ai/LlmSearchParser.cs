using System.Text.Json;
using Atlas.Application.Ai;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Atlas.Infrastructure.Ai;

/// <summary>
/// LLM-backed parsing with a strict JSON contract. Any failure falls back to
/// deterministic rules so search never breaks because of the AI layer.
/// </summary>
public sealed class LlmSearchParser(HttpClient http, IConfiguration config, RuleBasedSearchParser fallback, ILogger<LlmSearchParser> logger) : ISearchQueryParser
{
    private static readonly HashSet<string> Categories = ["nba", "pokemon", "one_piece", "disney"];
    private static readonly HashSet<string> Formats = ["fixed", "auction"];
    private static readonly HashSet<string> Types = ["single_card", "lot", "hobby_box", "accessory"];

    public async Task<ParsedSearch> ParseAsync(string query, CancellationToken ct = default)
    {
        try
        {
            var model = config["Ai:TextModel"] ?? "gpt-4o-mini";
            var payload = new
            {
                model,
                messages = new object[]
                {
                    new
                    {
                        role = "user",
                        content = "Extract marketplace search filters from this Filipino-collector query. Respond ONLY minified JSON: "
                            + "{\"category\":\"nba|pokemon|one_piece|disney|null\",\"format\":\"fixed|auction|null\","
                            + "\"type\":\"single_card|lot|hobby_box|accessory|null\",\"graded\":true|false|null,"
                            + "\"maxPrice\":number-in-PHP-or-null}. "
                            + $"Query: \"{query}\"",
                    },
                },
                response_format = new { type = "json_object" },
                max_tokens = 100,
            };

            using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions");
            req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer",
                config["OpenAI:ApiKey"]);
            req.Content = new StringContent(System.Text.Json.JsonSerializer.Serialize(payload),
                System.Text.Encoding.UTF8, "application/json");

            using var res = await http.SendAsync(req, ct);
            if (!res.IsSuccessStatusCode)
                return await fallback.ParseAsync(query, ct);

            using var doc = await System.Text.Json.JsonDocument.ParseAsync(await res.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
            var text = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString() ?? "{}";

            using var p = System.Text.Json.JsonDocument.Parse(text.Trim());
            var r = p.RootElement;

            string? Cat() { var v = Str(r, "category"); return v is not null && Categories.Contains(v) ? v : null; }
            string? Fmt() { var v = Str(r, "format"); return v is not null && Formats.Contains(v) ? v : null; }
            string? Typ() { var v = Str(r, "type"); return v is not null && Types.Contains(v) ? v : null; }
            bool? Graded() => r.TryGetProperty("graded", out var g) && g.ValueKind == System.Text.Json.JsonValueKind.True ? true : null;
            decimal? Max() => r.TryGetProperty("maxPrice", out var mp) && mp.TryGetDecimal(out var d) && d > 0 ? d : null;

            return new ParsedSearch(Cat(), Fmt(), Typ(), Graded(), Max(), Player: null);
        }
        catch (Exception e)
        {
            logger.LogWarning("LLM search parse failed ({Reason}) — using rules.", e.Message);
            return await fallback.ParseAsync(query, ct);
        }
    }

    private static string? Str(System.Text.Json.JsonElement el, string name) =>
        el.TryGetProperty(name, out var v) && v.ValueKind == System.Text.Json.JsonValueKind.String
            ? v.GetString()
            : null;
}
