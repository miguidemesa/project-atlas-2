using Atlas.Infrastructure.Storage;
using FluentAssertions;

namespace Atlas.Tests.Unit.Storage;

public class LocalFileSystemStorageTests : IDisposable
{
    private readonly string _testDir;
    private readonly LocalFileSystemStorage _storage;

    public LocalFileSystemStorageTests()
    {
        _testDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(_testDir);
        _storage = new LocalFileSystemStorage(_testDir, "http://localhost/uploads");
    }

    public void Dispose() => Directory.Delete(_testDir, true);

    [Fact]
    public async Task PutAsync_StoresFileAndReturnsUrl()
    {
        using var stream = new MemoryStream("test content"u8.ToArray());

        var key = await _storage.PutAsync(stream, "test.jpg", "image/jpeg");

        key.Should().NotBeNullOrWhiteSpace();
        File.Exists(Path.Combine(_testDir, key)).Should().BeTrue();

        var url = _storage.GetUrl(key);
        url.Should().Contain("http://localhost/uploads/");
    }

    [Fact]
    public async Task DeleteAsync_RemovesFile()
    {
        using var stream = new MemoryStream("test"u8.ToArray());
        var key = await _storage.PutAsync(stream, "del.jpg", "image/jpeg");

        await _storage.DeleteAsync(key);

        File.Exists(Path.Combine(_testDir, key)).Should().BeFalse();
    }

    [Fact]
    public async Task DeleteAsync_NonExistentKey_DoesNotThrow()
    {
        var act = async () => await _storage.DeleteAsync("does-not-exist.jpg");

        await act.Should().NotThrowAsync();
    }

    [Fact]
    public void GetUrl_TrimsTrailingSlashFromBaseUrl()
    {
        var storage = new LocalFileSystemStorage(_testDir, "http://localhost/uploads/");

        storage.GetUrl("a/b.jpg").Should().Be("http://localhost/uploads/a/b.jpg");
    }
}
