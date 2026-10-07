using System.Net.Http.Json;
using Atlas.Web.Api.Listings;

namespace Atlas.Tests.Api;

/// <summary>Listings created through the API, so each test owns its data.</summary>
public static class TestListings
{
    public static async Task<ListingDto> CreateAsync(HttpClient seller, string category = "pokemon",
        string format = "fixed", decimal price = 1500m, string language = "en", string set = "Test Set")
    {
        var res = await seller.PostAsJsonAsync("/api/listings", new
        {
            category,
            player = $"Test Card {Guid.NewGuid():N}"[..20],
            team = category == "basketball" ? "Test Team" : null,
            year = category == "basketball" ? 2024 : (int?)null,
            set,
            cardNumber = "001/100",
            language,
            graded = false,
            condition = "NM",
            type = "single_card",
            format,
            price,
            endsInHours = format == "auction" ? 1 : (int?)null,
        });
        return await res.DataAsync<ListingDto>();
    }
}
