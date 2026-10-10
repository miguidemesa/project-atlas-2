using System.Net;
using System.Net.Http.Json;
using Atlas.Domain.Notifications;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace Atlas.Tests.Api;

[Collection(ApiCollection.Name)]
public class PushWorkerTests(ApiFactory factory)
{
    private static async Task WaitForAsync(Func<Task<bool>> condition)
    {
        var deadline = DateTime.UtcNow.AddSeconds(10);
        while (!await condition() && DateTime.UtcNow < deadline)
            await Task.Delay(100);
    }

    /// <summary>A client on the worker's host, signed in as a new user with one registered phone.</summary>
    private async Task<(HttpClient Client, string Token)> PhoneOnAsync(Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory<Program> host)
    {
        var (signedIn, _) = await factory.SignInNewUserAsync();
        var client = host.CreateClient();
        client.DefaultRequestHeaders.Authorization = signedIn.DefaultRequestHeaders.Authorization;
        var token = $"ExponentPushToken[{Guid.NewGuid():N}]";
        (await client.PostAsJsonAsync("/api/me/devices", new { token, platform = "android" })).EnsureSuccessStatusCode();
        return (client, token);
    }

    [Fact]
    public async Task The_Worker_Sends_A_Test_Alert_Within_Seconds_Of_The_Request()
    {
        var expo = new FakeExpo();
        await using var host = expo.Host(factory, worker: true);
        var (client, token) = await PhoneOnAsync(host);

        var res = await client.PostAsync("/api/me/notifications/test", null);

        res.StatusCode.Should().Be(HttpStatusCode.Accepted);
        await WaitForAsync(() => Task.FromResult(expo.MessagesTo(token).Count > 0));
        expo.MessagesTo(token).Should().ContainSingle()
            .Which.GetProperty("data").GetProperty("url").GetString().Should().Be("atlas://me/notifications");
    }

    [Fact]
    public async Task A_Failed_Round_Is_Logged_And_The_Worker_Keeps_Going()
    {
        var expo = new FakeExpo();
        var requests = 0;
        expo.Respond = messages => Interlocked.Increment(ref requests) == 1
            ? throw new InvalidOperationException("Unexpected failure inside a round")
            : FakeExpo.Tickets(messages.Select(_ => (object)new { status = "ok" }));
        await using var host = expo.Host(factory, worker: true);
        var (client, _) = await PhoneOnAsync(host);

        var created = await (await client.PostAsync("/api/me/notifications/test", null)).DataAsync<Created>();

        await WaitForAsync(async () =>
        {
            await using var db = factory.NewDb();
            return await db.Notifications.AnyAsync(n => n.Id == created.Id && n.PushStatus == PushStatus.Sent);
        });
        await using var check = factory.NewDb();
        (await check.Notifications.SingleAsync(n => n.Id == created.Id)).PushStatus.Should().Be(PushStatus.Sent);
        (await client.GetAsync("/api/health")).StatusCode.Should().Be(HttpStatusCode.OK); // the API is still up
    }

    private sealed record Created(Guid Id);
}
