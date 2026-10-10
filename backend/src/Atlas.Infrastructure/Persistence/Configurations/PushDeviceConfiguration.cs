using Atlas.Domain.Notifications;
using Atlas.Infrastructure.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Atlas.Infrastructure.Persistence.Configurations;

public class PushDeviceConfiguration : IEntityTypeConfiguration<PushDevice>
{
    public void Configure(EntityTypeBuilder<PushDevice> b)
    {
        b.ToTable("push_devices");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).HasColumnName("id");
        b.Property(x => x.UserId).HasColumnName("user_id").IsRequired();
        b.Property(x => x.Token).HasColumnName("token").HasMaxLength(200).IsRequired();
        b.Property(x => x.Platform).HasColumnName("platform").HasMaxLength(10).IsRequired();
        b.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
        b.Property(x => x.LastSeenAt).HasColumnName("last_seen_at").IsRequired();
        b.Property(x => x.DisabledAt).HasColumnName("disabled_at");

        b.HasIndex(x => x.Token).IsUnique().HasDatabaseName("uq_push_devices_token");
        b.HasIndex(x => x.UserId).HasDatabaseName("idx_push_devices_user");

        b.HasOne<AppUser>()
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .HasConstraintName("fk_push_devices_user")
            .OnDelete(DeleteBehavior.Cascade);
    }
}
