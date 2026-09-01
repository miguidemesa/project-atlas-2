using System.Security.Claims;
using Atlas.Infrastructure.Rewards;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Atlas.Web.Api.Controllers;

/// <summary>Loyalty points: balance, history, earned from verified orders.</summary>
[ApiController]
[Authorize]
[Route("api/rewards")]
public class RewardsController(IRewardsService rewards) : ControllerBase
{
    private Guid? CurrentUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : null;

    [HttpGet("mine")]
    public async Task<IActionResult> Mine(CancellationToken ct)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();
        var (balance, history) = await rewards.SummaryAsync(userId.Value, ct);
        return Ok(new { data = new { balance, history } });
    }
}
