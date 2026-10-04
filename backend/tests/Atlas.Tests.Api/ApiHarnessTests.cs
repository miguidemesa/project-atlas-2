using Atlas.Infrastructure.Authentication;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Atlas.Tests.Api;

/// <summary>Checks the harness itself, so a broken helper surfaces here and not in a feature test.</summary>
[Collection(ApiCollection.Name)]
public class ApiHarnessTests(ApiFactory factory)
{
    // AddPayments falls back to the mock provider when this key is missing; tests must not lean on that.
    [Fact]
    public void Pins_The_Payment_Provider_To_Mock() =>
        factory.Services.GetRequiredService<IConfiguration>()["Payments:Provider"].Should().Be("Mock");

    [Fact]
    public async Task SignInNewUserAsync_Returns_A_Client_Authenticated_As_The_New_User()
    {
        var (client, userId) = await factory.SignInNewUserAsync("Harness User");

        var me = await (await client.GetAsync("/api/auth/me")).DataAsync<AuthUserDto>();

        me.Id.Should().Be(userId);
        me.Name.Should().Be("Harness User");
    }
}
