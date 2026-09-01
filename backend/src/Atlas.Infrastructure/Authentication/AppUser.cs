using Microsoft.AspNetCore.Identity;

namespace Atlas.Infrastructure.Authentication;

public class AppUser : IdentityUser<Guid>
{
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Role { get; set; } = "buyer";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}