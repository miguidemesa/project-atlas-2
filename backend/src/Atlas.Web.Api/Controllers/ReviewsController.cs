using System.Security.Claims;
using Atlas.Infrastructure.Reviews;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Atlas.Web.Api.Controllers;

public sealed record PostReviewRequest(int Rating, string? Content);

[ApiController]
[Authorize]
[Route("api/orders/{orderId:guid}/review")]
public class OrderReviewController(IReviewService reviews) : ControllerBase
{
    private Guid? CurrentUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : null;

    [HttpPost]
    public async Task<IActionResult> Post(Guid orderId, [FromBody] PostReviewRequest request, CancellationToken ct)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();
        try
        {
            return Ok(new { data = await reviews.PostAsync(orderId, userId.Value, request.Rating, request.Content, ct) });
        }
        catch (KeyNotFoundException e) { return NotFound(new { error = e.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (ArgumentException e) { return BadRequest(new { error = e.Message }); }
        catch (InvalidOperationException e) { return Conflict(new { error = e.Message }); }
    }
}

[ApiController]
[Route("api/sellers/{sellerId:guid}/reviews")]
public class SellerReviewsController(IReviewService reviews) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> ForSeller(Guid sellerId, CancellationToken ct)
        => Ok(new { data = await reviews.ForSellerAsync(sellerId, ct) });
}
