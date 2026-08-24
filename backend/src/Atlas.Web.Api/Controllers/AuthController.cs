using Atlas.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Atlas.Web.Api.Controllers;

public sealed record RegisterRequest(string Email, string Name, string Password);
public sealed record LoginRequest(string Email, string Password);
public sealed record RefreshRequest(string RefreshToken);

[ApiController]
[Route("api/auth")]
public class AuthController(IAuthService auth) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
        => FromResult(await auth.RegisterAsync(request.Email, request.Name, request.Password, ct));

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
        => FromResult(await auth.LoginAsync(request.Email, request.Password, ct));

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request, CancellationToken ct)
        => FromResult(await auth.RefreshAsync(request.RefreshToken, ct));

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        if (!Guid.TryParse(User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value, out var userId))
            return Unauthorized();
        var user = await auth.GetCurrentUserAsync(userId, ct);
        return user is null ? Unauthorized() : Ok(new { data = user });
    }

    private IActionResult FromResult(AuthResult result)
    {
        if (!result.Ok)
            return BadRequest(new { error = result.Error });
        return Ok(new { data = new { tokens = result.Tokens, user = result.User } });
    }
}
