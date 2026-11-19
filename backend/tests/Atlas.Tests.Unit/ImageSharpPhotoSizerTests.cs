using Atlas.Application.Common.Interfaces;
using Atlas.Infrastructure.Storage;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Metadata.Profiles.Exif;
using SixLabors.ImageSharp.PixelFormats;

namespace Atlas.Tests.Unit;

public class ImageSharpPhotoSizerTests
{
    private static readonly Rgba32 Blue = new(30, 90, 200);
    private readonly ImageSharpPhotoSizer _sizer = new(NullLogger<ImageSharpPhotoSizer>.Instance);

    private static byte[] Png(int width, int height)
    {
        using var image = new Image<Rgba32>(width, height, Blue);
        using var output = new MemoryStream();
        image.SaveAsPng(output);
        return output.ToArray();
    }

    [Fact]
    public async Task A_Wide_Photo_Gets_A_1200_And_A_480_Copy_In_Its_Own_Format()
    {
        var copies = await _sizer.MakeCopiesAsync(Png(1600, 2234), default);

        copies.Select(c => (c.Size, c.Width)).Should().Equal((PhotoSize.Large, 1200), (PhotoSize.Small, 480));
        copies.Should().OnlyContain(c => c.Extension == ".png" && c.ContentType == "image/png");
    }

    [Fact]
    public async Task A_Narrow_Photo_Is_Never_Upscaled() =>
        (await _sizer.MakeCopiesAsync(Png(400, 558), default)).Should().BeEmpty();

    [Fact]
    public async Task Copies_Keep_The_Seller_s_Colours()
    {
        var small = (await _sizer.MakeCopiesAsync(Png(1600, 2234), default)).Single(c => c.Size == PhotoSize.Small);
        using var image = Image.Load<Rgba32>(small.Bytes);
        image[240, 300].Should().Be(Blue);
    }

    [Fact]
    public async Task Copies_Carry_No_Camera_Data()
    {
        using var source = new Image<Rgba32>(1600, 2234, Blue);
        source.Metadata.ExifProfile = new ExifProfile();
        source.Metadata.ExifProfile.SetValue(ExifTag.Software, "phone camera");
        using var jpeg = new MemoryStream();
        source.SaveAsJpeg(jpeg);

        var copies = await _sizer.MakeCopiesAsync(jpeg.ToArray(), default);

        copies.Should().NotBeEmpty();
        foreach (var copy in copies) Image.Identify(copy.Bytes).Metadata.ExifProfile.Should().BeNull();
    }

    [Fact]
    public async Task Unreadable_Bytes_Give_No_Copies() =>
        (await _sizer.MakeCopiesAsync([1, 2, 3, 4], default)).Should().BeEmpty();
}
