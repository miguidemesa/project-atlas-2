using System.Security.Claims;
using Atlas.Infrastructure.Orders;
using Atlas.Infrastructure.Persistence;
using Atlas.Infrastructure.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Atlas.Web.Api.Controllers;

public sealed record PayRequest(string? ShippingAddress);

/// <summary>
/// Payment orchestration. PayMongo → hosted checkout URL; state advances
/// only from PSP-verified sources (status poll below or signed webhook).
/// </summary>
[ApiController]
[Authorize]
[Route("api/orders")]
public class PaymentsController(AtlasDbContext db, IPaymentProvider payments, IOrderService orders) : ControllerBase
{
    private Guid? CurrentUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : null;

    [HttpPost("{id:guid}/pay")]
    public async Task<IActionResult> Pay(Guid id, [FromBody] PayRequest? request, CancellationToken ct)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();

        var order = await db.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order is null) return NotFound(new { error = "Order not found." });
        if (order.BuyerId != userId) return Forbid();

        try
        {
            var checkout = await payments.StartCheckoutAsync(order.Id, order.Price, ct);

            // stamps session id + collects address for accepted-offer orders
            await orders.BeginPaymentAsync(id, userId.Value, request?.ShippingAddress,
                checkout?.SessionId ?? $"mock_{id:N}", ct);

            if (checkout is null)
            {
                await orders.MarkPaidAsync(id, ct); // dev mock capture
                var mine = (await orders.MineAsync(userId.Value, ct)).First(o => o.Id == id);
                return Ok(new { data = new { order = mine } });
            }

            return Ok(new { data = new { checkoutUrl = checkout.Url } });
        }
        catch (KeyNotFoundException e) { return NotFound(new { error = e.Message }); }
        catch (OrderForbiddenException) { return Forbid(); }
        catch (ArgumentException e) { return BadRequest(new { error = e.Message }); }
        catch (OrderConflictException e) { return Conflict(new { error = e.Message }); }
        catch (InvalidOperationException e) { return BadRequest(new { error = e.Message }); }
    }

    /// <summary>PSP-verified status poll — the no-domain alternative to webhooks.</summary>
    [HttpGet("{id:guid}/payment-status")]
    public async Task<IActionResult> PaymentStatus(Guid id, CancellationToken ct)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();

        async Task<OrderDto?> snapshot() =>
            (await orders.MineAsync(userId.Value, ct)).FirstOrDefault(o => o.Id == id);

        var mine = await snapshot();
        if (mine is null) return NotFound(new { error = "Order not found." });

        if (mine.Status == "pending_payment")
        {
            var sessionId = await db.Orders.AsNoTracking()
                .Where(o => o.Id == id)
                .Select(o => o.PaymentSessionId)
                .FirstOrDefaultAsync(ct);

            if (!string.IsNullOrWhiteSpace(sessionId) && !sessionId.StartsWith("mock_"))
            {
                var status = await payments.GetCheckoutStatusAsync(sessionId, ct);
                if (status == "paid")
                    await orders.MarkPaidAsync(id, ct);
                mine = await snapshot();
            }
        }

        return Ok(new { data = new { status = mine!.Status, trackingNumber = mine.TrackingNumber } });
    }
}
