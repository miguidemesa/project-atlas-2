using System.Net.Http.Json;
using System.Text.Json;

namespace Atlas.Tests.Api;

public static class HttpExtensions
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private sealed record Envelope<T>(T Data);

    /// <summary>Fails with the response body on a non-2xx status, otherwise unwraps the API's { data } envelope.</summary>
    public static async Task<T> DataAsync<T>(this HttpResponseMessage res)
    {
        if (!res.IsSuccessStatusCode)
            throw new HttpRequestException($"{(int)res.StatusCode}: {await res.Content.ReadAsStringAsync()}");
        var envelope = await res.Content.ReadFromJsonAsync<Envelope<T>>(Json);
        return envelope!.Data;
    }
}
