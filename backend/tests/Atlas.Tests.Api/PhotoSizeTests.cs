using System.Net.Http.Headers;
using Atlas.Web.Api.Listings;
using FluentAssertions;

namespace Atlas.Tests.Api;

[Collection(ApiCollection.Name)]
public class PhotoSizeTests(ApiFactory factory)
{
    [Fact]
    public async Task An_Upload_Gets_Copies_For_Tiles_And_The_Listing_Beside_The_Original()
    {
        var (seller, _) = await factory.SignInNewUserAsync();
        var listing = await TestListings.CreateAsync(seller, category: "digimon");
        using var form = new MultipartFormDataContent();
        var file = new ByteArrayContent(TestImages.Png(1600, 2234));
        file.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        form.Add(file, "file", "card.png");

        (await seller.PostAsync($"/api/listings/{listing.Id}/photos", form)).EnsureSuccessStatusCode();

        var detail = await (await seller.GetAsync($"/api/listings/{listing.Id}")).DataAsync<ListingDetailDto>();
        var sizes = detail.Listing.PhotoSizes.Should().ContainSingle().Subject;
        sizes.Large.Should().Contain(".w1200.");
        sizes.Small.Should().Contain(".w480.");
        sizes.Original.Should().Be(detail.Listing.ImageUrl);
        detail.Listing.ImageSmallUrl.Should().Be(sizes.Small);
    }

    [Fact]
    public async Task A_Listing_Without_Photos_Has_No_Sizes()
    {
        var (seller, _) = await factory.SignInNewUserAsync();
        var listing = await TestListings.CreateAsync(seller, category: "digimon");

        var detail = await (await seller.GetAsync($"/api/listings/{listing.Id}")).DataAsync<ListingDetailDto>();

        detail.Listing.ImageSmallUrl.Should().BeNull();
        detail.Listing.PhotoSizes.Should().BeEmpty();
    }
}
