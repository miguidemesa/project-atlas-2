using FluentAssertions;

namespace Atlas.Tests.Api;

public class ApiFactoryTests
{
    [Theory]
    [InlineData("Host=x;Database=atlas_marketplace;Username=u")]
    [InlineData("Host=x;Username=u")]
    public void Refuses_Databases_That_Are_Not_Disposable(string connectionString) =>
        FluentActions.Invoking(() => ApiFactory.EnsureDisposableDatabase(connectionString))
            .Should().Throw<InvalidOperationException>();

    [Fact]
    public void Accepts_A_Test_Database() =>
        FluentActions.Invoking(() => ApiFactory.EnsureDisposableDatabase("Host=x;Database=atlas_test;Username=u"))
            .Should().NotThrow();
}
