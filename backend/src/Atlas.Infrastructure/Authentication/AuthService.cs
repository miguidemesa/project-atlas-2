using Atlas.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;

namespace Atlas.Infrastructure.Authentication;

public sealed record TokenResponse(string AccessToken, DateTime AccessTokenExpiresAt, string RefreshToken);
public sealed record AuthUserDto(Guid Id, string Email, string Name, string Role);
public sealed record AuthResult(bool Ok, string? Error, TokenResponse? Tokens = null, AuthUserDto? User = null);

public interface IAuthService
{
    Task<AuthResult> RegisterAsync(string email, string name, string password, CancellationToken ct = default);
    Task<AuthResult> LoginAsync(string email, string password, CancellationToken ct = default);
    Task<AuthResult> RefreshAsync(string refreshTokenRaw, CancellationToken ct = default);
    Task<AuthUserDto?> GetCurrentUserAsync(Guid userId, CancellationToken ct = default);
}

public sealed class AuthService(
    UserManager<AppUser> userManager,
    ITokenService tokens,
    AtlasDbContext db,
    ILogger<AuthService> logger) : IAuthService
{
    public async Task<AuthResult> RegisterAsync(string email, string name, string password, CancellationToken ct = default)
    {
        email = email.Trim().ToLowerInvariant();
        if (!System.Text.RegularExpressions.Regex.IsMatch(email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
            return Fail("Enter a valid email address.");
        if (string.IsNullOrWhiteSpace(name) || name.Trim().Length < 2)
            return Fail("Tell us your name.");
        if (password.Length < 8)
            return Fail("Password must be at least 8 characters.");

        var existing = await userManager.FindByEmailAsync(email);
        if (existing is not null)
            return Fail("That email is already registered.");

        var user = new AppUser
        {
            UserName = email,
            Email = email,
            Name = name.Trim(),
            Role = "buyer",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        var result = await userManager.CreateAsync(user, password);
        if (!result.Succeeded)
            return Fail(string.Join(" ", result.Errors.Select(e => e.Description)));

        logger.LogInformation("New user registered: {Email}", email);
        return await IssueTokensAsync(user);
    }

    public async Task<AuthResult> LoginAsync(string email, string password, CancellationToken ct = default)
    {
        var user = await userManager.FindByEmailAsync(email.Trim().ToLowerInvariant());
        if (user is null || !await userManager.CheckPasswordAsync(user, password))
            return Fail("Email or password is incorrect.");

        return await IssueTokensAsync(user);
    }

    public async Task<AuthResult> RefreshAsync(string refreshTokenRaw, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(refreshTokenRaw))
            return Fail("Refresh token is required.");

        var hash = tokens.HashRefreshToken(refreshTokenRaw);
        var stored = db.RefreshTokens.FirstOrDefault(t => t.TokenHash == hash);

        if (stored is null)
            return Fail("Invalid refresh token.");
        if (stored.RevokedAt is not null)
        {
            logger.LogWarning("Reuse of revoked refresh token for user {UserId}", stored.UserId);
            return Fail("Session expired. Please sign in again.");
        }
        if (stored.ExpiresAt <= DateTime.UtcNow)
            return Fail("Session expired. Please sign in again.");

        var user = await userManager.FindByIdAsync(stored.UserId.ToString());
        if (user is null)
            return Fail("Account no longer exists.");

        // rotate: revoke old, issue new pair
        stored.RevokedAt = DateTime.UtcNow;
        return await IssueTokensAsync(user);
    }

    public async Task<AuthUserDto?> GetCurrentUserAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        return user is null ? null : new AuthUserDto(user.Id, user.Email ?? "", user.Name, user.Role);
    }

    private async Task<AuthResult> IssueTokensAsync(AppUser user)
    {
        var (access, expiresAt) = tokens.CreateAccessToken(user);
        var rawRefresh = tokens.GenerateRefreshTokenRaw();

        db.RefreshTokens.Add(new RefreshTokenEntity
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = tokens.HashRefreshToken(rawRefresh),
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        return new AuthResult(
            true,
            null,
            new TokenResponse(access, expiresAt, rawRefresh),
            new AuthUserDto(user.Id, user.Email ?? "", user.Name, user.Role));
    }

    private static AuthResult Fail(string error) => new(false, error);
}
