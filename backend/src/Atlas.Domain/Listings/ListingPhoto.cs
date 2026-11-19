namespace Atlas.Domain.Listings;

public class ListingPhoto
{
    public Guid Id { get; set; }
    public Guid ListingId { get; set; }
    public Listing? Listing { get; set; }
    public string StorageKey { get; set; } = string.Empty;
    public string? Url { get; set; }
    /// <summary>The 1200px copy for the listing page; null when the original is that narrow or older than P2.</summary>
    public string? LargeKey { get; set; }
    public string? LargeUrl { get; set; }
    /// <summary>The 480px copy for tiles.</summary>
    public string? SmallKey { get; set; }
    public string? SmallUrl { get; set; }
    public int SortOrder { get; set; }
}