using Atlas.Infrastructure.Accounts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Atlas.Web.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/me")]
public class AccountController(AccountDeletion deletion) : ControllerBase
{
    /// <summary>Deletes the signed-in account. 409 says what to finish first; otherwise the account is anonymized.</summary>
    [HttpDelete]
    public async Task<IActionResult> Delete(CancellationToken ct)
    {
        if (User.UserId() is not { } userId) return Unauthorized();
        var blockers = await deletion.BlockersAsync(userId, ct);
        if (blockers.Count > 0) return Conflict(new { error = AccountDeletion.Explain(blockers) });
        await deletion.AnonymizeAsync(userId, ct);
        return NoContent();
    }
}
