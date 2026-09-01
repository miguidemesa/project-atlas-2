using System.Security.Claims;
using Atlas.Application.Listings;
using Atlas.Infrastructure.Offers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Atlas.Web.Api.Controllers;

[ApiController]
[Route("api/offers")]
[Authorize]
public class OffersController(IOfferService offers) : ControllerBase
{
    private Guid? CurrentUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : null;

    [HttpGet("mine")]
    public async Task<IActionResult> Mine(CancellationToken ct)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();
        var (incoming, outgoing) = await offers.MineAsync(userId.Value, ct);
        return Ok(new { data = new { incoming, outgoing } });
    }

    [HttpPost("{id:guid}/counter")]
    public async Task<IActionResult> Counter(Guid id, [FromBody] CounterRequest request, CancellationToken ct)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();
        try
        {
            return Ok(new { data = await offers.CounterAsync(id, userId.Value, request.Amount, ct) });
        }
        catch (KeyNotFoundException e) { return NotFound(new { error = e.Message }); }
        catch (UnauthorizedAccessException e) { return StatusCode(403, new { error = "forbidden: " + e.Message }); }
        catch (InvalidOperationException e) { return Conflict(new { error = e.Message }); }
    }

    [HttpPost("{id:guid}/accept")]
    public async Task<IActionResult> Accept(Guid id, CancellationToken ct)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();
        try
        {
            return Ok(new { data = await offers.AcceptAsync(id, userId.Value, ct) });
        }
        catch (KeyNotFoundException e) { return NotFound(new { error = e.Message }); }
        catch (UnauthorizedAccessException e) { return StatusCode(403, new { error = "forbidden: " + e.Message }); }
        catch (InvalidOperationException e) { return Conflict(new { error = e.Message }); }
    }

    [HttpPost("{id:guid}/decline")]
    public async Task<IActionResult> Decline(Guid id, CancellationToken ct)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();
        try
        {
            await offers.DeclineAsync(id, userId.Value, ct);
            return Ok(new { data = new { declined = true } });
        }
        catch (KeyNotFoundException e) { return NotFound(new { error = e.Message }); }
        catch (UnauthorizedAccessException e) { return StatusCode(403, new { error = "forbidden: " + e.Message }); }
        catch (InvalidOperationException e) { return Conflict(new { error = e.Message }); }
    }
}
