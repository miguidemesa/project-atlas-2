namespace Atlas.Domain.Listings;

public class ListingPhoto
{
    public Guid Id { get; set; }
    public Guid ListingId { get; set; }
    public string StorageKey { get; set; } = string.Empty;
    public string? Url { get; set; }
    public int SortOrder { get; set; }
}