using System.Security.Claims;
using Atlas.Infrastructure.Disputes;
using Atlas.Infrastructure.Ops;
using Atlas.Infrastructure.Orders;
using Atlas.Infrastructure.Persistence;
using Atlas.Infrastructure.Payouts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Atlas.Web.Api.Controllers;

public sealed record PayoutReqBody(decimal Amount, string Method, string Destination);
public sealed record ResolveBody(string Outcome, string? Note);

[ApiController]
[Authorize]
[Route("api/wallet")]
public class WalletController(AtlasDbContext db) : ControllerBase
{
    private Guid? Uid() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : null;

    [HttpGet("mine")]
    public async Task<IActionResult> Mine(CancellationToken ct)
    {
        var uid = Uid();
        if (uid is null) return Unauthorized();

        var history = await db.WalletEntries.AsNoTracking()
            .Where(w => w.UserId == uid)
            .OrderByDescending(w => w.CreatedAt)
            .Take(30)
            .Select(w => new { w.Id, w.Delta, w.Kind, w.OrderId, w.CreatedAt })
            .ToListAsync(ct);

        var balance = history.Sum(h => h.Delta);
        return Ok(new { data = new { balance, history } });
    }
}

[ApiController]
[Authorize]
[Route("api/payouts")]
public class PayoutsController(IPayoutService payouts) : ControllerBase
{
    private Guid? Uid() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : null;

    public sealed record RequestBody(decimal Amount, string Method, string Destination);

    [HttpPost]
    public async Task<IActionResult> Request([FromBody] RequestBody body, CancellationToken ct)
    {
        var uid = Uid();
        if (uid is null) return Unauthorized();
        try
        {
            return Ok(new { data = await payouts.RequestAsync(uid.Value, body.Amount, body.Method, body.Destination, ct) });
        }
        catch (PayoutException e) { return BadRequest(new { error = e.Message }); }
    }

    [HttpGet("mine")]
    public async Task<IActionResult> Mine(CancellationToken ct)
    {
        var uid = Uid();
        if (uid is null) return Unauthorized();
        return Ok(new { data = await payouts.MineAsync(uid.Value, ct) });
    }
}

/// <summary>Admin: payouts settlement + dispute resolution.</summary>
[ApiController]
[Authorize(Roles = "admin")]
[Route("api/admin")]
public class AdminOpsController(IPayoutService payouts, IDisputeService disputes) : ControllerBase
{
    private Guid? Uid() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : null;

    [HttpGet("payouts")]
    public async Task<IActionResult> PendingPayouts(CancellationToken ct)
        => Ok(new { data = await payouts.PendingAsync(ct) });

    [HttpPost("payouts/{id:guid}/approve")]
    public async Task<IActionResult> ApprovePayout(Guid id, CancellationToken ct)
    {
        var uid = Uid();
        if (uid is null) return Unauthorized();
        try { return Ok(new { data = await payouts.ApproveAsync(id, uid.Value, ct) }); }
        catch (PayoutException e) { return Conflict(new { error = e.Message }); }
    }

    public sealed record RejectBody(string? Note);

    [HttpPost("payouts/{id:guid}/reject")]
    public async Task<IActionResult> RejectPayout(Guid id, [FromBody] RejectBody body, CancellationToken ct)
    {
        var uid = Uid();
        if (uid is null) return Unauthorized();
        try { return Ok(new { data = await payouts.RejectAsync(id, uid.Value, body.Note ?? "", ct) }); }
        catch (PayoutException e) { return Conflict(new { error = e.Message }); }
    }

    [HttpGet("disputes")]
    public async Task<IActionResult> DisputesByStatus([FromQuery] string status, CancellationToken ct)
        => Ok(new { data = await disputes.ByStatusAsync(status, ct) });

    public sealed record ResolveBody(string Outcome, string? Note);

    [HttpPost("disputes/{id:guid}/resolve")]
    public async Task<IActionResult> Resolve(Guid id, [FromBody] ResolveBody body, CancellationToken ct)
    {
        try
        {
            await disputes.ResolveAsync(id, body.Outcome, body.Note, ct);
            return Ok(new { data = new { resolved = true, outcome = body.Outcome } });
        }
        catch (KeyNotFoundException e) { return NotFound(new { error = e.Message }); }
        catch (DisputeException e) { return Conflict(new { error = e.Message }); }
    }
}
