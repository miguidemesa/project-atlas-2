using Microsoft.AspNetCore.Mvc;

namespace Atlas.Web.Api.Controllers;

[ApiController]
[Route("api/app-config")]
public class AppConfigController(IConfiguration config) : ControllerBase
{
    /// <summary>What the phone app checks at launch: the oldest version still allowed to run (setting App:MinimumVersion).</summary>
    [HttpGet]
    public IActionResult Get() =>
        Ok(new { data = new { minimumAppVersion = config["App:MinimumVersion"] ?? "1.0.0" } });
}
