using Atlas.Infrastructure.Persistence;
using Atlas.Web.Api.Listings;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Atlas.Web.Api.Controllers;

[ApiController]
[Route("api/sellers")]
public class SellersController(AtlasDbContext db, ListingDtoBuilder dtos) : ControllerBase
{
    private const int MaxListings = 60;

    /// <summary>Public seller page: real stats plus their live listings.</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var seller = await dtos.SellerAsync(id, ct);
        if (seller is null) return NotFound(new { error = "Seller not found." });

        var listings = await db.LiveListings(DateTime.UtcNow)
            .Where(l => l.SellerId == id)
            .OrderByDescending(l => l.CreatedAt)
            .Take(MaxListings)
            .ToListAsync(ct);
        return Ok(new { data = new SellerPageDto(seller, await dtos.BuildAsync(listings, ct)) });
    }
}
