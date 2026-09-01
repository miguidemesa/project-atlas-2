using Atlas.Application.Common.Interfaces;

namespace Atlas.Infrastructure.Storage;

/// <summary>
/// Filesystem-backed object storage for local development.
/// Keys are relative paths under the base directory; path traversal is rejected.
/// </summary>
public class LocalFileSystemStorage(string basePath, string baseUrl) : IObjectStorage
{
    private readonly string _rootPath = Path.GetFullPath(basePath);
    private readonly string _baseUrl = baseUrl.TrimEnd('/');

    public async Task<string> PutAsync(Stream data, string key, string contentType, CancellationToken cancellationToken = default)
    {
        var safeKey = ValidateKey(key);
        var fullPath = Path.Combine(_rootPath, safeKey);

        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        await using var output = File.Create(fullPath);
        await data.CopyToAsync(output, cancellationToken);

        return safeKey;
    }

    public Task DeleteAsync(string key, CancellationToken cancellationToken = default)
    {
        var safeKey = ValidateKey(key);
        var fullPath = Path.Combine(_rootPath, safeKey);

        if (File.Exists(fullPath))
            File.Delete(fullPath);

        return Task.CompletedTask;
    }

    public string GetUrl(string key) => $"{_baseUrl}/{ValidateKey(key)}";

    private static string ValidateKey(string key)
    {
        if (string.IsNullOrWhiteSpace(key))
            throw new ArgumentException("Storage key cannot be empty", nameof(key));

        var normalized = key.Replace('\\', '/').TrimStart('/');

        if (normalized.Contains("..") || Path.IsPathRooted(normalized))
            throw new ArgumentException($"Invalid storage key: '{key}'", nameof(key));

        return normalized;
    }
}
