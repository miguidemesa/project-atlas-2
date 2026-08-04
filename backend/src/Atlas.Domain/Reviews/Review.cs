namespace Atlas.Domain.Reviews;

public class Review
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public Guid ReviewerId { get; set; }
    public Guid RevieweeId { get; set; }
    public int Rating { get; set; }
    public string? Content { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}