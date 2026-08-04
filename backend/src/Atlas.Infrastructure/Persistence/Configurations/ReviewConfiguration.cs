using Atlas.Domain.Reviews;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Atlas.Infrastructure.Persistence.Configurations;

public class ReviewConfiguration : IEntityTypeConfiguration<Review>
{
    public void Configure(EntityTypeBuilder<Review> b)
    {
        b.ToTable("reviews", t => t.HasCheckConstraint("chk_rating_range", "rating BETWEEN 1 AND 5"));
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).HasColumnName("id");
        b.Property(x => x.OrderId).HasColumnName("order_id").IsRequired();
        b.Property(x => x.ReviewerId).HasColumnName("reviewer_id").IsRequired();
        b.Property(x => x.RevieweeId).HasColumnName("reviewee_id").IsRequired();
        b.Property(x => x.Rating).HasColumnName("rating").IsRequired();
        b.Property(x => x.Content).HasColumnName("content").HasMaxLength(1000);
        b.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();

        b.HasIndex(x => new { x.OrderId, x.ReviewerId }).IsUnique().HasDatabaseName("uq_review_per_order");
        b.HasIndex(x => x.RevieweeId).HasDatabaseName("idx_reviews_reviewee");
    }
}