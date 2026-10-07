using Atlas.Application.Listings;
using Atlas.Web.Api.Controllers;
using FluentAssertions;

namespace Atlas.Tests.Api;

[Collection(ApiCollection.Name)]
public class CategoriesEndpointTests(ApiFactory factory)
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Lists_Every_Category_In_Order_With_Live_Counts()
    {
        var categories = await (await _client.GetAsync("/api/categories")).DataAsync<List<CategoryDto>>();

        categories.Select(c => c.Slug).Should().Equal(CategoryList.All.Select(c => c.Slug));
        categories.Single(c => c.Slug == "basketball").ActiveListings.Should().BeGreaterThan(0); // seeded NBA, renamed
        categories.Single(c => c.Slug == "lorcana").ActiveListings.Should().BeGreaterThan(0);    // seeded Disney, renamed
        categories.Single(c => c.Slug == "gundam").ActiveListings.Should().Be(0);
        categories.Single(c => c.Slug == "magic").Name.Should().Be("Magic: The Gathering");
    }
}
