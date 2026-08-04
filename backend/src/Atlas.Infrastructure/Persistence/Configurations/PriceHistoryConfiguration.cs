using Atlas.Domain.Pricing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Atlas.Infrastructure.Persistence.Configurations;

public class PriceHistoryConfiguration : IEntityTypeConfiguration<PriceHistory>
{
    public void Configure(EntityTypeBuilder<PriceHistory> b)
    {
        b.ToTable("price_history");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).HasColumnName("id");
        b.Property(x => x.CardIdentityKey).HasColumnName("card_identity_key").HasMaxLength(500).IsRequired();
        b.Property(x => x.SalePrice).HasColumnName("sale_price").HasColumnType("numeric(18,2)").IsRequired();
        b.Property(x => x.SaleDate).HasColumnName("sale_date").IsRequired();
        b.Property(x => x.Source).HasColumnName("source").HasMaxLength(50).HasDefaultValue("internal_transaction").IsRequired();

        b.HasIndex(x => new { x.CardIdentityKey, x.SaleDate }).IsDescending(false, true).HasDatabaseName("idx_pricehistory_key_date");
    }
}