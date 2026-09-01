using Atlas.Domain.Messages;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Atlas.Infrastructure.Persistence.Configurations;

public class MessageConfiguration : IEntityTypeConfiguration<Message>
{
    public void Configure(EntityTypeBuilder<Message> b)
    {
        b.ToTable("messages");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).HasColumnName("id");
        b.Property(x => x.SenderId).HasColumnName("sender_id").IsRequired();
        b.Property(x => x.RecipientId).HasColumnName("recipient_id").IsRequired();
        b.Property(x => x.ListingId).HasColumnName("listing_id");
        b.Property(x => x.Content).HasColumnName("content").HasMaxLength(4000).IsRequired();
        b.Property(x => x.Kind).HasColumnName("kind").HasMaxLength(20).HasDefaultValue("user");
        b.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
        b.Property(x => x.ReadAt).HasColumnName("read_at");

        b.HasIndex(x => new { x.RecipientId, x.CreatedAt }).HasDatabaseName("idx_messages_recipient");
        b.HasIndex(x => new { x.SenderId, x.CreatedAt }).HasDatabaseName("idx_messages_sender");
        b.HasIndex(x => x.ListingId).HasDatabaseName("idx_messages_listing");

        b.HasOne<Atlas.Domain.Listings.Listing>()
            .WithMany()
            .HasForeignKey(x => x.ListingId)
            .HasConstraintName("fk_messages_listings")
            .OnDelete(DeleteBehavior.SetNull);

        b.HasOne<Atlas.Infrastructure.Authentication.AppUser>()
            .WithMany()
            .HasForeignKey(x => x.SenderId)
            .HasConstraintName("fk_messages_sender")
            .OnDelete(DeleteBehavior.Restrict);

        b.HasOne<Atlas.Infrastructure.Authentication.AppUser>()
            .WithMany()
            .HasForeignKey(x => x.RecipientId)
            .HasConstraintName("fk_messages_recipient")
            .OnDelete(DeleteBehavior.Restrict);
    }
}