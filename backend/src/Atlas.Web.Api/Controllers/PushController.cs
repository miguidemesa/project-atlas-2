using System.Text.RegularExpressions;
using Atlas.Domain.Notifications;
using Atlas.Infrastructure.Notifications;
using Atlas.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Atlas.Web.Api.Controllers;

public sealed record RegisterDeviceRequest(string? Token, string? Platform);
public sealed record PreferenceDto(string Category, bool PushEnabled);
public sealed record SavePreferencesRequest(IReadOnlyList<PreferenceDto>? Preferences);

/// <summary>Push alerts for the signed-in user: this phone's Expo token, and which categories may push.</summary>
[ApiController]
[Authorize]
[Route("api/me")]
public class PushController(AtlasDbContext db, NotificationService notifications, IWebHostEnvironment env) : ControllerBase
{
    private static readonly Regex ExpoToken = new(@"^Expo(nent)?PushToken\[[^\]]{1,180}\]$", RegexOptions.Compiled);

    /// <summary>Registers this phone, or refreshes it. A token that was registered to another account moves to this one.</summary>
    [HttpPost("devices")]
    public async Task<IActionResult> RegisterDevice([FromBody] RegisterDeviceRequest body, CancellationToken ct)
    {
        if (User.UserId() is not { } userId) return Unauthorized();
        if (body.Token is null || !ExpoToken.IsMatch(body.Token))
            return BadRequest(new { error = "That isn't an Expo push token." });
        if (body.Platform is not ("ios" or "android"))
            return BadRequest(new { error = "Platform must be ios or android." });

        var now = DateTime.UtcNow;
        var device = await db.PushDevices.FirstOrDefaultAsync(d => d.Token == body.Token, ct);
        if (device is null)
        {
            device = new PushDevice { Id = Guid.NewGuid(), Token = body.Token, CreatedAt = now };
            db.PushDevices.Add(device);
        }
        device.UserId = userId;
        device.Platform = body.Platform;
        device.LastSeenAt = now;
        device.DisabledAt = null;
        await db.SaveChangesAsync(ct);
        return Ok(new { data = new { device.Token, device.Platform } });
    }

    /// <summary>Stops alerts to this phone (sign-out). Only the account that owns the token can remove it.</summary>
    [HttpDelete("devices/{token}")]
    public async Task<IActionResult> UnregisterDevice(string token, CancellationToken ct)
    {
        if (User.UserId() is not { } userId) return Unauthorized();
        var removed = await db.PushDevices.Where(d => d.Token == token && d.UserId == userId).ExecuteDeleteAsync(ct);
        return removed == 0 ? NotFound(new { error = "This phone isn't registered for alerts." }) : NoContent();
    }

    [HttpGet("notification-preferences")]
    public async Task<IActionResult> GetPreferences(CancellationToken ct)
    {
        if (User.UserId() is not { } userId) return Unauthorized();
        return Ok(new { data = await PreferencesAsync(userId, ct) });
    }

    [HttpPut("notification-preferences")]
    public async Task<IActionResult> SavePreferences([FromBody] SavePreferencesRequest body, CancellationToken ct)
    {
        if (User.UserId() is not { } userId) return Unauthorized();
        if (body.Preferences is null || body.Preferences.Count == 0)
            return BadRequest(new { error = "Send at least one preference." });

        var wanted = new Dictionary<NotificationCategory, bool>(); // a repeated category keeps its last value
        foreach (var p in body.Preferences)
        {
            if (!NotificationCategories.TryParse(p.Category, out var category))
                return BadRequest(new { error = $"Unknown notification category '{p.Category}'." });
            wanted[category] = p.PushEnabled;
        }

        var existing = await db.NotificationPreferences.Where(p => p.UserId == userId).ToListAsync(ct);
        foreach (var (category, enabled) in wanted)
        {
            var row = existing.FirstOrDefault(p => p.Category == category);
            if (row is null)
                db.NotificationPreferences.Add(new NotificationPreference { UserId = userId, Category = category, PushEnabled = enabled });
            else
                row.PushEnabled = enabled;
        }
        await db.SaveChangesAsync(ct);
        return Ok(new { data = await PreferencesAsync(userId, ct) });
    }

    /// <summary>"Send me a test alert" from the app's notification settings. Development only.</summary>
    [HttpPost("notifications/test")]
    public async Task<IActionResult> SendTestAlert(CancellationToken ct)
    {
        if (!env.IsDevelopment()) return NotFound(new { error = "Not found." });
        if (User.UserId() is not { } userId) return Unauthorized();
        var notification = await notifications.NotifyAsync(userId, NotificationCategory.Announcements,
            "Test alert", "Push alerts are working on this phone.", "atlas://me/notifications", ct);
        return Accepted(new { data = new { id = notification.Id } });
    }

    /// <summary>Every category in enum order; push stays on until the user turns a category off.</summary>
    private async Task<List<PreferenceDto>> PreferencesAsync(Guid userId, CancellationToken ct)
    {
        var off = await db.NotificationPreferences
            .Where(p => p.UserId == userId && !p.PushEnabled)
            .Select(p => p.Category)
            .ToListAsync(ct);
        return Enum.GetValues<NotificationCategory>()
            .Select(c => new PreferenceDto(NotificationCategories.Slug(c), !off.Contains(c)))
            .ToList();
    }
}
