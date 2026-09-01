using Atlas.Domain.Orders;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Atlas.Infrastructure.Persistence.Configurations;

public class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> b)
    {
        b.ToTable("orders");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).HasColumnName("id");
        b.Property(x => x.ListingId).HasColumnName("listing_id").IsRequired();
        b.Property(x => x.BuyerId).HasColumnName("buyer_id").IsRequired();
        b.Property(x => x.SellerId).HasColumnName("seller_id").IsRequired();
        b.Property(x => x.Price).HasColumnName("price").HasColumnType("numeric(18,2)").IsRequired();
        b.Property(x => x.Status).HasColumnName("status").HasConversion<string>().IsRequired();
        b.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
        b.Property(x => x.UpdatedAt).HasColumnName("updated_at").IsRequired();
        b.Property(x => x.PaidAt).HasColumnName("paid_at");
        b.Property(x => x.ShippedAt).HasColumnName("shipped_at");
        b.Property(x => x.DeliveredAt).HasColumnName("delivered_at");
        b.Property(x => x.TrackingNumber).HasColumnName("tracking_number").HasMaxLength(100);
        b.Property(x => x.PaymentSessionId).HasColumnName("payment_session_id").HasMaxLength(100);

        b.HasIndex(x => new { x.BuyerId, x.Status }).HasDatabaseName("idx_orders_buyer");
        b.HasIndex(x => new { x.SellerId, x.Status }).HasDatabaseName("idx_orders_seller");

        b.HasOne<Atlas.Domain.Listings.Listing>()
            .WithMany()
            .HasForeignKey(x => x.ListingId)
            .HasConstraintName("fk_orders_listings")
            .OnDelete(DeleteBehavior.Restrict);

        b.HasOne<Atlas.Infrastructure.Authentication.AppUser>()
            .WithMany()
            .HasForeignKey(x => x.BuyerId)
            .HasConstraintName("fk_orders_buyer")
            .OnDelete(DeleteBehavior.Restrict);

        b.HasOne<Atlas.Infrastructure.Authentication.AppUser>()
            .WithMany()
            .HasForeignKey(x => x.SellerId)
            .HasConstraintName("fk_orders_seller")
            .OnDelete(DeleteBehavior.Restrict);
    }
}