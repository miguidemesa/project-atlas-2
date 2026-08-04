using Atlas.Domain.Auctions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Atlas.Infrastructure.Persistence.Configurations;

public class AuctionConfiguration : IEntityTypeConfiguration<Auction>
{
    public void Configure(EntityTypeBuilder<Auction> b)
    {
        b.ToTable("auctions", t => t.HasCheckConstraint("chk_startprice_positive", "start_price >= 0"));
        b.HasKey(x => x.ListingId);
        b.Property(x => x.ListingId).HasColumnName("listing_id").IsRequired();
        b.Property(x => x.StartPrice).HasColumnName("start_price").HasColumnType("numeric(18,2)").IsRequired();
        b.Property(x => x.CurrentBid).HasColumnName("current_bid").HasColumnType("numeric(18,2)");
        b.Property(x => x.CurrentBidderId).HasColumnName("current_bidder_id");
        b.Property(x => x.EndTime).HasColumnName("end_time").IsRequired();
        b.Property(x => x.AutoExtendMinutes).HasColumnName("auto_extend_minutes").HasDefaultValue(5);
        b.Property(x => x.Status).HasColumnName("status").HasConversion<string>().IsRequired();

        b.HasIndex(x => new { x.Status, x.EndTime }).HasDatabaseName("idx_auctions_endtime");

        b.HasOne<Atlas.Domain.Listings.Listing>()
            .WithOne()
            .HasForeignKey<Auction>(x => x.ListingId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}