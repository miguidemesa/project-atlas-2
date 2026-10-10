using Atlas.Domain.Notifications;
using Atlas.Infrastructure.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Atlas.Infrastructure.Persistence.Configurations;

public class NotificationPreferenceConfiguration : IEntityTypeConfiguration<NotificationPreference>
{
    public void Configure(EntityTypeBuilder<NotificationPreference> b)
    {
        b.ToTable("notification_preferences");
        b.HasKey(x => new { x.UserId, x.Category });
        b.Property(x => x.UserId).HasColumnName("user_id");
        b.Property(x => x.Category).HasColumnName("category").HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.PushEnabled).HasColumnName("push_enabled").IsRequired();

        b.HasOne<AppUser>()
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .HasConstraintName("fk_notification_preferences_user")
            .OnDelete(DeleteBehavior.Cascade);
    }
}
