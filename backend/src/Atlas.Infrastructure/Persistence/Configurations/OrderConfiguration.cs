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

        b.HasIndex(x => new { x.BuyerId, x.Status }).HasDatabaseName("idx_orders_buyer");
        b.HasIndex(x => new { x.SellerId, x.Status }).HasDatabaseName("idx_orders_seller");
    }
}