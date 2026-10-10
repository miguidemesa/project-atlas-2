using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Atlas.Infrastructure.Notifications;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

namespace Atlas.Tests.Api;

/// <summary>Stands in for Expo's push API: records every message and answers with <see cref="Respond"/>.</summary>
public sealed class FakeExpo : HttpMessageHandler
{
    private readonly List<JsonElement> _messages = [];

    /// <summary>Expo's answer to one request's messages. By default an "ok" ticket for each.</summary>
    public Func<JsonElement[], HttpResponseMessage> Respond { get; set; } =
        messages => Tickets(messages.Select(_ => (object)new { status = "ok", id = Guid.NewGuid() }));

    public IReadOnlyList<JsonElement> MessagesTo(string token)
    {
        lock (_messages) return _messages.Where(m => m.GetProperty("to").GetString() == token).ToList();
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        var messages = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(ct)).RootElement
            .EnumerateArray().Select(m => m.Clone()).ToArray();
        lock (_messages) _messages.AddRange(messages);
        return Respond(messages);
    }

    public static HttpResponseMessage Tickets(IEnumerable<object> tickets) =>
        new(HttpStatusCode.OK) { Content = JsonContent.Create(new { data = tickets }) };

    /// <summary>A copy of the API whose ExpoPushClient talks to this fake, with the worker on or off.</summary>
    public WebApplicationFactory<Program> Host(ApiFactory factory, bool worker = false) =>
        factory.WithWebHostBuilder(b => b.ConfigureTestServices(s =>
        {
            s.AddHttpClient<ExpoPushClient>().ConfigurePrimaryHttpMessageHandler(() => this);
            s.Configure<PushOptions>(o =>
            {
                o.WorkerEnabled = worker;
                o.PollInterval = TimeSpan.FromMilliseconds(200);
            });
        }));
}
