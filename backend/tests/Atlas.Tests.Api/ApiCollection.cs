namespace Atlas.Tests.Api;

/// <summary>All API tests share one factory, so the database is created and seeded once per run.</summary>
[CollectionDefinition(Name)]
public sealed class ApiCollection : ICollectionFixture<ApiFactory>
{
    public const string Name = "api";
}
