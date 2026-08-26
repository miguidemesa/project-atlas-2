namespace Atlas.Domain.Disputes;

public class Dispute
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public Guid OpenedBy { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = "open";
    public string? ResolutionNote { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
}
