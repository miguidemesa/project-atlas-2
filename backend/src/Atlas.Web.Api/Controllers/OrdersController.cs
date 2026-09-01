using System.Security.Claims;
using Atlas.Infrastructure.Orders;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Atlas.Web.Api.Controllers;

public sealed record ShipRequest(string? TrackingNumber);

[ApiController]
[Route("api/orders")]
[Authorize]
public class OrdersController(IOrderService orders) : ControllerBase
{
    private Guid? CurrentUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : null;

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOrderRequest request, CancellationToken ct)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();
        try
        {
            var order = await orders.CreateAsync(userId.Value, request, ct);
            return Ok(new { data = order });
        }
        catch (KeyNotFoundException e) { return NotFound(new { error = e.Message }); }
        catch (ArgumentException e) { return BadRequest(new { error = e.Message }); }
        catch (OrderConflictException e) { return Conflict(new { error = e.Message }); }
    }

    public sealed record PayRequest(string? ShippingAddress);

    [HttpPost("{id:guid}/ship")]
    public async Task<IActionResult> Ship(Guid id, [FromBody] ShipRequest request, CancellationToken ct)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();
        try
        {
            return Ok(new { data = await orders.ShipAsync(id, userId.Value, request.TrackingNumber ?? "", ct) });
        }
        catch (OrderForbiddenException) { return Forbid(); }
        catch (OrderConflictException e) { return Conflict(new { error = e.Message }); }
    }

    [HttpPost("{id:guid}/confirm-delivery")]
    public async Task<IActionResult> ConfirmDelivery(Guid id, CancellationToken ct)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();
        try
        {
            return Ok(new { data = await orders.ConfirmDeliveryAsync(id, userId.Value, ct) });
        }
        catch (OrderForbiddenException) { return Forbid(); }
        catch (OrderConflictException e) { return Conflict(new { error = e.Message }); }
    }

    [HttpGet("mine")]
    public async Task<IActionResult> Mine(CancellationToken ct)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();
        return Ok(new { data = await orders.MineAsync(userId.Value, ct) });
    }
}
