using System.Security.Claims;
using Atlas.Infrastructure.Bids;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Atlas.Web.Api.Controllers;

public sealed record PlaceBidRequest(decimal Amount);

[ApiController]
[Route("api/listings/{id:guid}/bids")]
public class BidsController(IBidService bids) : ControllerBase
{
    private Guid? CurrentUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : null;

    [HttpGet]
    public async Task<IActionResult> History(Guid id, CancellationToken ct)
        => Ok(new { data = await bids.HistoryAsync(id, ct) });

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Place(Guid id, [FromBody] PlaceBidRequest request, CancellationToken ct)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();
        try
        {
            var result = await bids.PlaceBidAsync(id, userId.Value, request.Amount, ct);
            return Ok(new { data = result });
        }
        catch (KeyNotFoundException e) { return NotFound(new { error = e.Message }); }
        catch (BidForbiddenException) { return Forbid(); }
        catch (BidConflictException e) { return Conflict(new { error = e.Message }); }
    }
}
