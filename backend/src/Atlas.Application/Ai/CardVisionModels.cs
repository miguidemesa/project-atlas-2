namespace Atlas.Application.Ai;

public sealed record CardScanResult(
    string? Player,
    string? Set,
    int? Year,
    string? Parallel,
    double Confidence,
    bool IsMock);

/// <summary>
/// Identifies a trading card from its photo. Implementations call external
/// AI providers (OpenAI vision today); results always pre-fill the listing
/// form for human confirmation — never published without seller review.
/// </summary>
public interface ICardVisionService
{
    /// <param name="imageBase64">Raw image bytes already base64-encoded.</param>
    /// <param name="contentType">Declared mime type of the encoded image.</param>
    Task<CardScanResult> IdentifyAsync(string imageBase64, string contentType, CancellationToken ct = default);
}
