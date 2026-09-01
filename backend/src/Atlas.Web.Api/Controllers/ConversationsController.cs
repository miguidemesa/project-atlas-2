using System.Security.Claims;
using Atlas.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Atlas.Web.Api.Controllers;

public sealed record SendMessageRequest(Guid ToUserId, Guid? ListingId, string Content);

public sealed record ConversationDto(
    Guid OtherUserId,
    string OtherName,
    Guid? ListingId,
    string? ListingTitle,
    string LastMessage,
    DateTime LastAt,
    int Unread);

public sealed record MessageDto(
    Guid Id,
    Guid SenderId,
    bool Mine,
    string Content,
    string Kind,
    DateTime CreatedAt);

[ApiController]
[Authorize]
[Route("api/conversations")]
public class ConversationsController(AtlasDbContext db) : ControllerBase
{
    private Guid? CurrentUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : null;

    /// <summary>Threads grouped by counterparty + listing, newest activity first.</summary>
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var me = CurrentUserId();
        if (me is null) return Unauthorized();

        var rows = await db.Messages.AsNoTracking()
            .Where(m => m.SenderId == me || m.RecipientId == me)
            .Select(m => new { m.SenderId, m.RecipientId, m.ListingId, m.Content, m.CreatedAt, m.IsRead })
            .ToListAsync(ct);

        var names = await db.Users.AsNoTracking().ToDictionaryAsync(u => u.Id, u => u.Name, ct);
        var titles = await db.Listings.AsNoTracking().ToDictionaryAsync(l => l.Id, l => l.Title, ct);

        var threads = rows
            .GroupBy(m => new { Other = m.SenderId == me ? m.RecipientId : m.SenderId, Listing = m.ListingId })
            .Select(g =>
            {
                var last = g.OrderByDescending(m => m.CreatedAt).First();
                return new ConversationDto(
                    g.Key.Other,
                    names.GetValueOrDefault(g.Key.Other, "Atlas user"),
                    g.Key.Listing,
                    g.Key.Listing.HasValue ? titles.GetValueOrDefault(g.Key.Listing.Value) : null,
                    last.Content,
                    last.CreatedAt,
                    g.Count(m => !m.IsRead && m.RecipientId == me));
            })
            .OrderByDescending(c => c.LastAt)
            .ToList();

        return Ok(new { data = threads });
    }

    /// <summary>Full thread with a counterparty (optionally scoped to a listing). Marks their messages read.</summary>
    [HttpGet("{otherUserId:guid}/messages")]
    public async Task<IActionResult> Thread(Guid otherUserId, [FromQuery] Guid? listingId, CancellationToken ct)
    {
        var me = CurrentUserId();
        if (me is null) return Unauthorized();

        var query = db.Messages
            .Where(m => (m.SenderId == me && m.RecipientId == otherUserId)
                     || (m.SenderId == otherUserId && m.RecipientId == me));

        query = listingId.HasValue
            ? query.Where(m => m.ListingId == listingId)
            : query.Where(m => m.ListingId == null);

        var items = await query.OrderBy(m => m.CreatedAt).ToListAsync(ct);

        foreach (var m in items.Where(m => !m.IsRead && m.RecipientId == me))
        {
            m.IsRead = true;
            m.ReadAt = DateTime.UtcNow;
        }
        if (items.Any(m => m.IsRead)) await db.SaveChangesAsync(ct);

        var otherName = await db.Users.AsNoTracking()
            .Where(u => u.Id == otherUserId)
            .Select(u => u.Name)
            .FirstOrDefaultAsync(ct) ?? "Atlas user";

        return Ok(new
        {
            data = new
            {
                otherName,
                messages = items.Select(m => new MessageDto(m.Id, m.SenderId, m.SenderId == me, m.Content, m.Kind ?? "user", m.CreatedAt)),
            },
        });
    }

    /// <summary>Sends a message. Creates the thread implicitly.</summary>
    [HttpPost("{otherUserId:guid}/messages")]
    public async Task<IActionResult> Send(Guid otherUserId, [FromBody] SendMessageRequest request, CancellationToken ct)
    {
        var me = CurrentUserId();
        if (me is null) return Unauthorized();

        if (otherUserId == me) return BadRequest(new { error = "You can't message yourself." });
        if (string.IsNullOrWhiteSpace(request.Content))
            return BadRequest(new { error = "Write a message first." });

        var recipientExists = await db.Users.AnyAsync(u => u.Id == otherUserId, ct);
        if (!recipientExists) return NotFound(new { error = "Recipient not found." });
        if (request.ToUserId != otherUserId)
            return BadRequest(new { error = "Recipient mismatch." });

        var msg = new Domain.Messages.Message
        {
            Id = Guid.NewGuid(),
            SenderId = me.Value,
            RecipientId = otherUserId,
            ListingId = request.ListingId,
            Content = request.Content.Trim()[..Math.Min(2000, request.Content.Trim().Length)],
            Kind = "user",
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
        };
        db.Messages.Add(msg);
        await db.SaveChangesAsync(ct);

        return Ok(new { data = new MessageDto(msg.Id, msg.SenderId, true, msg.Content, msg.Kind, msg.CreatedAt) });
    }
}
