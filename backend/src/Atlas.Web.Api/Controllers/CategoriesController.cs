using Atlas.Application.Listings;
using Atlas.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;

namespace Atlas.Web.Api.Controllers;

[ApiController]
[Route("api/categories")]
public class CategoriesController(AtlasDbContext db) : ControllerBase
{
    /// <summary>Every category in display order, with how many live listings each has.</summary>
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var counts = await db.LiveListings(DateTime.UtcNow).LiveCountsByCategory(ct);

        var data = CategoryList.All
            .Select(c => new CategoryDto(c.Slug, c.Name, c.Group, c.Hue, counts.GetValueOrDefault(c.Slug)))
            .ToList();
        return Ok(new { data });
    }
}
