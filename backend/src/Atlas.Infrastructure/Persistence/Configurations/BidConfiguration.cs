using Atlas.Domain.Auctions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Atlas.Infrastructure.Persistence.Configurations;

public class BidConfiguration : IEntityTypeConfiguration<Bid>
{
    public void Configure(EntityTypeBuilder<Bid> b)
    {
        b.ToTable("bids");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).HasColumnName("id");
        b.Property(x => x.ListingId).HasColumnName("listing_id").IsRequired();
        b.Property(x => x.BidderId).HasColumnName("bidder_id").IsRequired();
        b.Property(x => x.Amount).HasColumnName("amount").HasColumnType("numeric(18,2)").IsRequired();
        b.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();

        b.HasIndex(x => new { x.ListingId, x.Amount }).IsDescending(false, true).HasDatabaseName("idx_bids_listing_amount");
        b.HasIndex(x => x.BidderId).HasDatabaseName("idx_bids_bidder");

        b.HasOne<Atlas.Domain.Listings.Listing>()
            .WithMany()
            .HasForeignKey(x => x.ListingId)
            .HasConstraintName("fk_bids_listings")
            .OnDelete(DeleteBehavior.Cascade);

        b.HasOne<Atlas.Infrastructure.Authentication.AppUser>()
            .WithMany()
            .HasForeignKey(x => x.BidderId)
            .HasConstraintName("fk_bids_bidder")
            .OnDelete(DeleteBehavior.Restrict);
    }
}