using Atlas.Domain.Notifications;
using Atlas.Infrastructure.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Atlas.Infrastructure.Persistence.Configurations;

public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> b)
    {
        b.ToTable("notifications");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).HasColumnName("id");
        b.Property(x => x.UserId).HasColumnName("user_id").IsRequired();
        b.Property(x => x.Category).HasColumnName("category").HasConversion<string>().HasMaxLength(20).IsRequired();
        b.Property(x => x.Title).HasColumnName("title").HasMaxLength(120).IsRequired();
        b.Property(x => x.Body).HasColumnName("body").HasMaxLength(500).IsRequired();
        b.Property(x => x.Url).HasColumnName("url").HasMaxLength(500).IsRequired();
        b.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
        b.Property(x => x.ReadAt).HasColumnName("read_at");
        b.Property(x => x.PushStatus).HasColumnName("push_status").HasConversion<string>().HasMaxLength(10).IsRequired();
        b.Property(x => x.PushAttempts).HasColumnName("push_attempts").IsRequired();
        b.Property(x => x.PushNextAttemptAt).HasColumnName("push_next_attempt_at");

        b.HasIndex(x => new { x.UserId, x.CreatedAt }).HasDatabaseName("idx_notifications_user");
        b.HasIndex(x => new { x.PushStatus, x.PushNextAttemptAt }).HasDatabaseName("idx_notifications_push_due");

        b.HasOne<AppUser>()
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .HasConstraintName("fk_notifications_user")
            .OnDelete(DeleteBehavior.Cascade);
    }
}
