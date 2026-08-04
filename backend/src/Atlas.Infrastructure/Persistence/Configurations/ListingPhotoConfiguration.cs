using Atlas.Domain.Listings;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Atlas.Infrastructure.Persistence.Configurations;

public class ListingPhotoConfiguration : IEntityTypeConfiguration<ListingPhoto>
{
    public void Configure(EntityTypeBuilder<ListingPhoto> b)
    {
        b.ToTable("listing_photos");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).HasColumnName("id");
        b.Property(x => x.ListingId).HasColumnName("listing_id").IsRequired();
        b.Property(x => x.StorageKey).HasColumnName("storage_key").HasMaxLength(500).IsRequired();
        b.Property(x => x.Url).HasColumnName("url").HasMaxLength(1000);
        b.Property(x => x.SortOrder).HasColumnName("sort_order").IsRequired();

        b.HasIndex(x => x.ListingId).HasDatabaseName("idx_listing_photos_listing");
        b.HasOne(x => x.Listing)
            .WithMany(l => l.Photos)
            .HasForeignKey(x => x.ListingId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}