using Atlas.Domain.Offers;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Atlas.Infrastructure.Persistence.Configurations;

public class OfferConfiguration : IEntityTypeConfiguration<Offer>
{
    public void Configure(EntityTypeBuilder<Offer> b)
    {
        b.ToTable("offers", t => t.HasCheckConstraint("chk_offer_amount_positive", "amount > 0"));
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).HasColumnName("id");
        b.Property(x => x.ListingId).HasColumnName("listing_id").IsRequired();
        b.Property(x => x.BuyerId).HasColumnName("buyer_id").IsRequired();
        b.Property(x => x.SellerId).HasColumnName("seller_id").IsRequired();
        b.Property(x => x.CreatedById).HasColumnName("created_by_id").IsRequired();
        b.Property(x => x.Amount).HasColumnName("amount").HasColumnType("numeric(18,2)").IsRequired();
        b.Property(x => x.Status).HasColumnName("status").HasConversion<string>().IsRequired();
        b.Property(x => x.CounterToId).HasColumnName("counter_to_id");
        b.Property(x => x.ExpiresAt).HasColumnName("expires_at").IsRequired();
        b.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
        b.Property(x => x.RespondedAt).HasColumnName("responded_at");

        b.HasIndex(x => new { x.BuyerId, x.Status }).HasDatabaseName("idx_offers_buyer");
        b.HasIndex(x => new { x.SellerId, x.Status }).HasDatabaseName("idx_offers_seller");

        b.HasOne<Domain.Listings.Listing>()
            .WithMany()
            .HasForeignKey(x => x.ListingId)
            .HasConstraintName("fk_offers_listings")
            .OnDelete(DeleteBehavior.Cascade);

        b.HasOne<Infrastructure.Authentication.AppUser>()
            .WithMany()
            .HasForeignKey(x => x.BuyerId)
            .HasConstraintName("fk_offers_buyer")
            .OnDelete(DeleteBehavior.Restrict);

        b.HasOne<Infrastructure.Authentication.AppUser>()
            .WithMany()
            .HasForeignKey(x => x.SellerId)
            .HasConstraintName("fk_offers_seller")
            .OnDelete(DeleteBehavior.Restrict);
    }
}
