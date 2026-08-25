using System.Security.Claims;
using Atlas.Application.Listings;
using Atlas.Infrastructure.Offers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Atlas.Web.Api.Controllers;

[ApiController]
[Route("api/listings/{listingId:guid}/offers")]
public class ListingOffersController(IOfferService offers) : ControllerBase
{
    private Guid? CurrentUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : null;

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Make(Guid listingId, [FromBody] MakeOfferRequest request, CancellationToken ct)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();
        try
        {
            return Ok(new { data = await offers.MakeAsync(userId.Value, listingId, request.Amount, ct) });
        }
        catch (KeyNotFoundException e) { return NotFound(new { error = e.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (InvalidOperationException e) { return Conflict(new { error = e.Message }); }
    }
}
