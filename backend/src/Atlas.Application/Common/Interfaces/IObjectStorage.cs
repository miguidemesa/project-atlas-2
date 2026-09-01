namespace Atlas.Application.Common.Interfaces;

/// <summary>
/// Storage abstraction for listing photos and other binary assets.
/// Implementations may target the local filesystem (dev) or an
/// S3-compatible bucket (production).
/// </summary>
public interface IObjectStorage
{
    /// <summary>Stores a stream under the given key and returns the key.</summary>
    Task<string> PutAsync(Stream data, string key, string contentType, CancellationToken cancellationToken = default);

    /// <summary>Removes the object stored under <paramref name="key"/>.</summary>
    Task DeleteAsync(string key, CancellationToken cancellationToken = default);

    /// <summary>Returns a publicly addressable URL for the object.</summary>
    string GetUrl(string key);
}
