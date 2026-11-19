using Atlas.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace Atlas.Infrastructure.Storage;

/// <summary>Bilinear downscaling (no sharpening), the orientation applied, the ICC profile kept, EXIF dropped.</summary>
public sealed class ImageSharpPhotoSizer(ILogger<ImageSharpPhotoSizer> logger) : IPhotoSizer
{
    private const int JpegQuality = 90;
    private static readonly (PhotoSize Size, int Width)[] Targets = [(PhotoSize.Large, 1200), (PhotoSize.Small, 480)];

    public async Task<IReadOnlyList<PhotoCopy>> MakeCopiesAsync(byte[] original, CancellationToken ct)
    {
        try
        {
            using var image = Image.Load(original);
            var format = image.Metadata.DecodedImageFormat ?? throw new UnknownImageFormatException("Unknown format.");
            image.Mutate(x => x.AutoOrient());
            image.Metadata.ExifProfile = null; // no camera or GPS data on copies; the ICC profile stays, so colours hold
            var copies = new List<PhotoCopy>();
            foreach (var (size, width) in Targets)
            {
                if (image.Width <= width) continue; // never upscale: the original already serves this size
                using var copy = image.Clone(x => x.Resize(new ResizeOptions
                {
                    Size = new Size(width, 0),
                    Mode = ResizeMode.Max,
                    Sampler = KnownResamplers.Triangle,
                }));
                await using var output = new MemoryStream();
                await copy.SaveAsync(output, EncoderFor(format), ct);
                copies.Add(new PhotoCopy(size, copy.Width, output.ToArray(), "." + format.FileExtensions.First(), format.DefaultMimeType));
            }
            return copies;
        }
        catch (Exception e) when (e is ImageFormatException or UnknownImageFormatException or InvalidImageContentException)
        {
            logger.LogWarning(e, "Could not size an uploaded photo; the listing serves the original only");
            return [];
        }
    }

    private static IImageEncoder EncoderFor(IImageFormat format) => format switch
    {
        JpegFormat => new JpegEncoder { Quality = JpegQuality },
        PngFormat => new PngEncoder(),
        WebpFormat => new WebpEncoder { Quality = JpegQuality },
        _ => throw new UnknownImageFormatException($"No encoder for {format.Name}."),
    };
}
