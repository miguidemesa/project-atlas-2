using System.Security.Claims;
using Atlas.Infrastructure.Disputes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Atlas.Web.Api.Controllers;

public sealed record OpenDisputeBody(string Reason);

[ApiController]
[Authorize]
[Route("api/disputes")]
public class DisputesController(IDisputeService disputes) : ControllerBase
{
    private Guid? Uid() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : null;

    [HttpPost("{orderId:guid}")]
    public async Task<IActionResult> Open(Guid orderId, [FromBody] OpenDisputeBody body, CancellationToken ct)
    {
        var uid = Uid();
        if (uid is null) return Unauthorized();
        try { return Ok(new { data = await disputes.OpenAsync(orderId, uid.Value, body.Reason, ct) }); }
        catch (KeyNotFoundException e) { return NotFound(new { error = e.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (DisputeException e) { return Conflict(new { error = e.Message }); }
    }

    [HttpGet("mine")]
    public async Task<IActionResult> Mine(CancellationToken ct)
    {
        var uid = Uid();
        if (uid is null) return Unauthorized();
        return Ok(new { data = await disputes.MineAsync(uid.Value, ct) });
    }
}
