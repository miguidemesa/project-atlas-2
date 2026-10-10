using System.Net;
using System.Net.Http.Json;
using System.Text;
using FluentAssertions;

namespace Atlas.Tests.Api;

[Collection(ApiCollection.Name)]
public class NotificationPreferenceTests(ApiFactory factory)
{
    private sealed record Preference(string Category, bool PushEnabled);

    private const string Path = "/api/me/notification-preferences";

    [Fact]
    public async Task Push_Is_On_For_Every_Category_Until_Turned_Off()
    {
        var (client, _) = await factory.SignInNewUserAsync();

        var prefs = await (await client.GetAsync(Path)).DataAsync<List<Preference>>();

        prefs.Should().Equal(
            new Preference("bids", true),
            new Preference("orders", true),
            new Preference("offers", true),
            new Preference("following", true),
            new Preference("announcements", true));
    }

    [Fact]
    public async Task Turning_One_Category_Off_Keeps_The_Others_On()
    {
        var (client, _) = await factory.SignInNewUserAsync();

        var saved = await (await client.PutAsJsonAsync(Path,
            new { preferences = new[] { new { category = "offers", pushEnabled = false } } })).DataAsync<List<Preference>>();
        var read = await (await client.GetAsync(Path)).DataAsync<List<Preference>>();

        saved.Should().Equal(read);
        read.Should().ContainSingle(p => !p.PushEnabled).Which.Category.Should().Be("offers");
    }

    [Fact]
    public async Task The_Last_Value_Wins_When_A_Category_Repeats()
    {
        var (client, _) = await factory.SignInNewUserAsync();

        var res = await client.PutAsJsonAsync(Path, new
        {
            preferences = new[] { new { category = "bids", pushEnabled = false }, new { category = "bids", pushEnabled = true } },
        });

        (await res.DataAsync<List<Preference>>()).Should().OnlyContain(p => p.PushEnabled);
    }

    [Theory]
    [InlineData("""{"preferences":[{"category":"spam","pushEnabled":false}]}""")]
    [InlineData("""{"preferences":[{"category":"1","pushEnabled":false}]}""")]
    [InlineData("""{"preferences":[]}""")]
    public async Task Rejects_Unknown_Categories_And_Empty_Requests(string body)
    {
        var (client, _) = await factory.SignInNewUserAsync();

        var res = await client.PutAsync(Path, new StringContent(body, Encoding.UTF8, "application/json"));

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
