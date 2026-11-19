namespace Atlas.Application.Common.Interfaces;

/// <summary>One downscaled copy of a photo, encoded in the original's format.</summary>
public sealed record PhotoCopy(PhotoSize Size, int Width, byte[] Bytes, string Extension, string ContentType);
