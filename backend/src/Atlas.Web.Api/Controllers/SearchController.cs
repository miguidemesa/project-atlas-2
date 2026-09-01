using Atlas.Application.Ai;
using Microsoft.AspNetCore.Mvc;

namespace Atlas.Web.Api.Controllers;

public sealed record ParseRequest(string Query);

/// <summary>Free-text to structured filters for the browse grid.</summary>
[ApiController]
[Route("api/search")]
public class SearchController(ISearchQueryParser parser) : ControllerBase
{
    [HttpPost("parse")]
    public async Task<IActionResult> Parse([FromBody] ParseRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Query))
            return BadRequest(new { error = "Enter a search phrase." });

        var parsed = await parser.ParseAsync(request.Query.Trim(), ct);
        return Ok(new { data = new
        {
            category = parsed.Category,
            format = parsed.Format,
            type = parsed.Type,
            graded = parsed.Graded,
            maxPrice = parsed.MaxPrice,
            player = parsed.Player,
        } });
    }
}
