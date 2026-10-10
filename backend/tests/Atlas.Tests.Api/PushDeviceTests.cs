using System.Net;
using System.Net.Http.Json;
using Atlas.Domain.Notifications;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace Atlas.Tests.Api;

[Collection(ApiCollection.Name)]
public class PushDeviceTests(ApiFactory factory)
{
    private static string NewToken() => $"ExponentPushToken[{Guid.NewGuid():N}]";

    private async Task<PushDevice?> DeviceAsync(string token)
    {
        await using var db = factory.NewDb();
        return await db.PushDevices.AsNoTracking().SingleOrDefaultAsync(d => d.Token == token);
    }

    [Fact]
    public async Task Registers_A_Phone_For_The_Signed_In_User()
    {
        var (client, userId) = await factory.SignInNewUserAsync();
        var token = NewToken();

        var res = await client.PostAsJsonAsync("/api/me/devices", new { token, platform = "ios" });

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var device = await DeviceAsync(token);
        device!.UserId.Should().Be(userId);
        device.Platform.Should().Be("ios");
        device.DisabledAt.Should().BeNull();
    }

    [Fact]
    public async Task Registering_Again_Refreshes_The_Same_Row_And_Turns_It_Back_On()
    {
        var (client, _) = await factory.SignInNewUserAsync();
        var token = NewToken();
        (await client.PostAsJsonAsync("/api/me/devices", new { token, platform = "android" })).EnsureSuccessStatusCode();
        await using (var db = factory.NewDb())
            await db.PushDevices.Where(d => d.Token == token).ExecuteUpdateAsync(s => s
                .SetProperty(d => d.DisabledAt, DateTime.UtcNow)
                .SetProperty(d => d.LastSeenAt, DateTime.UtcNow.AddDays(-30)));

        (await client.PostAsJsonAsync("/api/me/devices", new { token, platform = "android" })).EnsureSuccessStatusCode();

        var device = await DeviceAsync(token);
        device!.DisabledAt.Should().BeNull();
        device.LastSeenAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
        await using var check = factory.NewDb();
        (await check.PushDevices.CountAsync(d => d.Token == token)).Should().Be(1);
    }

    [Fact]
    public async Task A_Phone_That_Changes_Hands_Alerts_Only_The_New_Account()
    {
        var (first, _) = await factory.SignInNewUserAsync("First Owner");
        var (second, secondId) = await factory.SignInNewUserAsync("Second Owner");
        var token = NewToken();
        (await first.PostAsJsonAsync("/api/me/devices", new { token, platform = "ios" })).EnsureSuccessStatusCode();

        (await second.PostAsJsonAsync("/api/me/devices", new { token, platform = "ios" })).EnsureSuccessStatusCode();

        (await DeviceAsync(token))!.UserId.Should().Be(secondId);
    }

    [Theory]
    [InlineData("not-a-token", "ios")]
    [InlineData("ExponentPushToken[]", "ios")]
    [InlineData("ExponentPushToken[abc]", "windows")]
    public async Task Rejects_Bad_Tokens_And_Platforms(string token, string platform)
    {
        var (client, _) = await factory.SignInNewUserAsync();

        var res = await client.PostAsJsonAsync("/api/me/devices", new { token, platform });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await res.Content.ReadAsStringAsync()).Should().Contain("\"error\"");
    }

    [Fact]
    public async Task Needs_A_Signed_In_User() =>
        (await factory.CreateClient().PostAsJsonAsync("/api/me/devices", new { token = NewToken(), platform = "ios" }))
            .StatusCode.Should().Be(HttpStatusCode.Unauthorized);

    [Fact]
    public async Task Unregistering_Removes_Only_Your_Own_Phone()
    {
        var (owner, _) = await factory.SignInNewUserAsync();
        var (stranger, _) = await factory.SignInNewUserAsync("Stranger");
        var token = NewToken();
        (await owner.PostAsJsonAsync("/api/me/devices", new { token, platform = "ios" })).EnsureSuccessStatusCode();
        var path = $"/api/me/devices/{Uri.EscapeDataString(token)}";

        (await stranger.DeleteAsync(path)).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await owner.DeleteAsync(path)).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await DeviceAsync(token)).Should().BeNull();
    }
}
