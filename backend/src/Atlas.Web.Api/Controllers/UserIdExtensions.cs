using System.Security.Claims;

namespace Atlas.Web.Api.Controllers;

public static class UserIdExtensions
{
    /// <summary>The signed-in user's id from the access token's "sub" claim, or null.</summary>
    public static Guid? UserId(this ClaimsPrincipal user) =>
        Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub"), out var id) ? id : null;
}
