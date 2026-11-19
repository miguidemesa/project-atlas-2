using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;

namespace Atlas.Tests.Api;

/// <summary>Real image bytes for upload tests.</summary>
public static class TestImages
{
    public static byte[] Png(int width, int height)
    {
        using var image = new Image<Rgba32>(width, height, new Rgba32(30, 90, 200));
        using var output = new MemoryStream();
        image.SaveAsPng(output);
        return output.ToArray();
    }
}
