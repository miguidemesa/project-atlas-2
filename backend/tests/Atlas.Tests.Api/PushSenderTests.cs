using System.Net;
using Atlas.Domain.Notifications;
using Atlas.Infrastructure.Notifications;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Atlas.Tests.Api;

[Collection(ApiCollection.Name)]
public class PushSenderTests(ApiFactory factory)
{
    private readonly FakeExpo _expo = new();

    /// <summary>A new user with one registered phone.</summary>
    private async Task<(Guid UserId, string Token)> UserWithPhoneAsync()
    {
        var (_, userId) = await factory.SignInNewUserAsync();
        var token = $"ExponentPushToken[{Guid.NewGuid():N}]";
        await using var db = factory.NewDb();
        db.PushDevices.Add(new PushDevice { Id = Guid.NewGuid(), UserId = userId, Token = token, Platform = "ios" });
        await db.SaveChangesAsync();
        return (userId, token);
    }

    private static async Task<Notification> NotifyAsync(IServiceProvider services, Guid userId,
        NotificationCategory category = NotificationCategory.Orders)
    {
        await using var scope = services.CreateAsyncScope();
        return await scope.ServiceProvider.GetRequiredService<NotificationService>().NotifyAsync(userId, category,
            "Your order shipped", "Charizard ex is on its way: tracking JT0123.", "atlas://orders", CancellationToken.None);
    }

    private static async Task SendDueAsync(IServiceProvider services)
    {
        await using var scope = services.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<PushSender>().SendDueAsync(CancellationToken.None);
    }

    private async Task<Notification> ReloadAsync(Guid id)
    {
        await using var db = factory.NewDb();
        return await db.Notifications.AsNoTracking().SingleAsync(n => n.Id == id);
    }

    [Fact]
    public async Task Writes_An_In_App_Notification_Then_Sends_It_With_Its_Link_And_Channel()
    {
        await using var host = _expo.Host(factory);
        var (userId, token) = await UserWithPhoneAsync();

        var notification = await NotifyAsync(host.Services, userId);
        notification.PushStatus.Should().Be(PushStatus.Pending);
        _expo.MessagesTo(token).Should().BeEmpty(); // never sent inside the caller's request

        await SendDueAsync(host.Services);

        var message = _expo.MessagesTo(token).Should().ContainSingle().Subject;
        message.GetProperty("title").GetString().Should().Be("Your order shipped");
        message.GetProperty("channelId").GetString().Should().Be("orders");
        message.GetProperty("data").GetProperty("url").GetString().Should().Be("atlas://orders");
        (await ReloadAsync(notification.Id)).PushStatus.Should().Be(PushStatus.Sent);
    }

    [Fact]
    public async Task A_Category_Turned_Off_Stays_In_App_Only()
    {
        await using var host = _expo.Host(factory);
        var (userId, token) = await UserWithPhoneAsync();
        await using (var db = factory.NewDb())
        {
            db.NotificationPreferences.Add(new NotificationPreference { UserId = userId, Category = NotificationCategory.Offers, PushEnabled = false });
            await db.SaveChangesAsync();
        }

        var notification = await NotifyAsync(host.Services, userId, NotificationCategory.Offers);
        await SendDueAsync(host.Services);

        notification.PushStatus.Should().Be(PushStatus.None);
        _expo.MessagesTo(token).Should().BeEmpty();
    }

    [Fact]
    public async Task Disables_A_Token_Expo_Reports_As_No_Longer_Registered()
    {
        await using var host = _expo.Host(factory);
        var (userId, token) = await UserWithPhoneAsync();
        _expo.Respond = messages => FakeExpo.Tickets(messages.Select(m => m.GetProperty("to").GetString() == token
            ? new { status = "error", message = "not registered", details = new { error = "DeviceNotRegistered" } }
            : (object)new { status = "ok", id = Guid.NewGuid() }));

        var notification = await NotifyAsync(host.Services, userId);
        await SendDueAsync(host.Services);

        await using var db = factory.NewDb();
        (await db.PushDevices.SingleAsync(d => d.Token == token)).DisabledAt.Should().NotBeNull();
        (await ReloadAsync(notification.Id)).PushStatus.Should().Be(PushStatus.Failed);
    }

    [Fact]
    public async Task Waits_And_Retries_While_Expo_Is_Down_Then_Gives_Up()
    {
        await using var host = _expo.Host(factory);
        var (userId, token) = await UserWithPhoneAsync();
        _expo.Respond = _ => new HttpResponseMessage(HttpStatusCode.ServiceUnavailable);

        var notification = await NotifyAsync(host.Services, userId);
        await SendDueAsync(host.Services);

        var retried = await ReloadAsync(notification.Id);
        retried.PushStatus.Should().Be(PushStatus.Pending);
        retried.PushAttempts.Should().Be(1);
        retried.PushNextAttemptAt.Should().BeAfter(DateTime.UtcNow.AddSeconds(20));

        await using (var db = factory.NewDb())
            await db.Notifications.Where(n => n.Id == notification.Id).ExecuteUpdateAsync(s => s
                .SetProperty(n => n.PushAttempts, 4)
                .SetProperty(n => n.PushNextAttemptAt, DateTime.UtcNow));
        await SendDueAsync(host.Services);

        (await ReloadAsync(notification.Id)).PushStatus.Should().Be(PushStatus.Failed);
        _expo.MessagesTo(token).Should().HaveCount(2);
    }

    [Fact]
    public async Task A_User_With_No_Phone_Keeps_The_In_App_Notification_Only()
    {
        await using var host = _expo.Host(factory);
        var (_, userId) = await factory.SignInNewUserAsync();

        var notification = await NotifyAsync(host.Services, userId);
        await SendDueAsync(host.Services);

        (await ReloadAsync(notification.Id)).PushStatus.Should().Be(PushStatus.None);
    }
}
