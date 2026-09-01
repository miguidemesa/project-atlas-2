using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Atlas.Infrastructure.Authentication;

public interface ITokenService
{
    (string Token, DateTime ExpiresAt) CreateAccessToken(AppUser user);
    string GenerateRefreshTokenRaw();
    string HashRefreshToken(string raw);
}

public sealed class TokenService(IConfiguration config) : ITokenService
{
    public (string Token, DateTime ExpiresAt) CreateAccessToken(AppUser user)
    {
        var minutes = config.GetValue("Jwt:AccessTokenExpiryMinutes", 15);
        var expiresAt = DateTime.UtcNow.AddMinutes(minutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email ?? ""),
            new("name", user.Name),
            new("role", user.Role),
        };

        var key = new SymmetricSecurityKey(SecretKeyBytes(config));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expiresAt,
            signingCredentials: creds);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }

    public string GenerateRefreshTokenRaw()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    public string HashRefreshToken(string raw) =>
        Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(raw)));

    private static byte[] SecretKeyBytes(IConfiguration config) =>
        System.Text.Encoding.UTF8.GetBytes(config["Jwt:SecretKey"] ?? throw new InvalidOperationException("Jwt:SecretKey is not configured."));
}
