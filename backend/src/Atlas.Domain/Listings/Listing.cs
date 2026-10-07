using Atlas.Domain.Listings;
using Atlas.Domain.Shared;

namespace Atlas.Domain.Listings;

public class Listing
{
    public Guid Id { get; set; }
    public Guid SellerId { get; set; }
    public ListingType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    /// <summary>Category slug from Atlas.Application.Listings.CategoryList.</summary>
    public string Category { get; set; } = string.Empty;
    /// <summary>The player on a sports card, or the card or character name for every other game.</summary>
    public string Player { get; set; } = string.Empty;
    /// <summary>Sports cards only.</summary>
    public string? Team { get; set; }
    public int? Year { get; set; }
    public string Set { get; set; } = string.Empty;
    public string? CardNumber { get; set; }
    public string Language { get; set; } = "en";
    public string? Parallel { get; set; }
    public bool Numbered { get; set; }
    public string? SerialNumber { get; set; }
    public bool Graded { get; set; }
    public string? GradingCompany { get; set; }
    public string? GradeValue { get; set; }
    /// <summary>Raw cards: NM, LP, MP, HP or DMG.</summary>
    public string? Condition { get; set; }
    public decimal Price { get; set; }
    public ListingFormat ListingFormat { get; set; }
    public ListingStatus Status { get; set; } = ListingStatus.Draft;
    public int ViewCount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<ListingPhoto> Photos { get; set; } = new List<ListingPhoto>();
}