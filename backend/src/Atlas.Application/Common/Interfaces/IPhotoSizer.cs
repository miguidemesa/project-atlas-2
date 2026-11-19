namespace Atlas.Application.Common.Interfaces;

/// <summary>
/// Downscaled copies of an uploaded card photo (spec §8, the photo rule): resize only, no sharpening, no colour
/// change, no crop. The original is stored as uploaded and stays the source for zoom.
/// </summary>
public interface IPhotoSizer
{
    /// <summary>Copies narrower than the original, largest first; none when it is already narrow or can't be read.</summary>
    Task<IReadOnlyList<PhotoCopy>> MakeCopiesAsync(byte[] original, CancellationToken ct);
}
