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
    public string Sport { get; set; } = "basketball";
    public string Player { get; set; } = string.Empty;
    public string Team { get; set; } = string.Empty;
    public int Year { get; set; }
    public string Set { get; set; } = string.Empty;
    public string? Parallel { get; set; }
    public bool Numbered { get; set; }
    public string? SerialNumber { get; set; }
    public bool Graded { get; set; }
    public string? GradingCompany { get; set; }
    public string? GradeValue { get; set; }
    public string? Condition { get; set; }
    public decimal Price { get; set; }
    public ListingFormat ListingFormat { get; set; }
    public ListingStatus Status { get; set; } = ListingStatus.Draft;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<ListingPhoto> Photos { get; set; } = new List<ListingPhoto>();
}