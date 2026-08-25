using System.Security.Claims;
using Atlas.Application.Ai;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Atlas.Web.Api.Controllers;

/// <summary>
/// Scan-to-list: identifies a card from its photo. Results pre-fill the
/// listing form — the seller always confirms before anything is published.
/// </summary>
[ApiController]
[Authorize]
[Route("api/vision")]
public class VisionController(ICardVisionService vision) : ControllerBase
{
    private static readonly HashSet<string> Allowed = ["image/jpeg", "image/png", "image/webp"];
    private const long MaxBytes = 8 * 1024 * 1024;

    [HttpPost("scan-card")]
    public async Task<IActionResult> ScanCard([FromForm] IFormFile image, CancellationToken ct)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();

        var file = image;
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "Attach a photo of the card." });
        if (file.Length > MaxBytes)
            return BadRequest(new { error = "Photos must be 8 MB or smaller." });
        if (!Allowed.Contains(file.ContentType))
            return BadRequest(new { error = "Only JPEG, PNG or WebP images are accepted." });

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, ct);
        var base64 = Convert.ToBase64String(ms.ToArray());

        try
        {
            var result = await vision.IdentifyAsync(base64, file.ContentType, ct);
            return Ok(new { data = result });
        }
        catch (InvalidOperationException e)
        {
            return StatusCode(503, new { error = e.Message });
        }
    }

    private Guid? CurrentUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : null;
}
