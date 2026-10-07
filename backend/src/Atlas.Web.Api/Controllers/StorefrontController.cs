using Atlas.Application.Listings;
using Atlas.Web.Api.Listings;
using Microsoft.AspNetCore.Mvc;

namespace Atlas.Web.Api.Controllers;

[ApiController]
[Route("api/storefront")]
public class StorefrontController(StorefrontService storefront) : ControllerBase
{
    /// <summary>The home page shelves, or one game's hub with ?category=pokemon.</summary>
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? category, CancellationToken ct)
    {
        if (category is not null && !CategoryList.IsValid(category))
            return BadRequest(new { error = $"Unknown category '{category}'." });
        return Ok(new { data = await storefront.GetAsync(category, ct) });
    }
}
