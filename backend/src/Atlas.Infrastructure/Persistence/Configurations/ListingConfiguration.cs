using Atlas.Domain.Listings;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Atlas.Infrastructure.Persistence.Configurations;

public class ListingConfiguration : IEntityTypeConfiguration<Listing>
{
    public void Configure(EntityTypeBuilder<Listing> b)
    {
        b.ToTable("listings", t => t.HasCheckConstraint("chk_price_positive", "price >= 0"));
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).HasColumnName("id");
        b.Property(x => x.SellerId).HasColumnName("seller_id").IsRequired();
        b.Property(x => x.Type).HasColumnName("type").HasConversion<string>().IsRequired();
        b.Property(x => x.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
        b.Property(x => x.Description).HasColumnName("description").HasMaxLength(2000);
        b.Property(x => x.Sport).HasColumnName("sport").HasMaxLength(50).HasDefaultValue("basketball");
        b.Property(x => x.Player).HasColumnName("player").HasMaxLength(200).IsRequired();
        b.Property(x => x.Team).HasColumnName("team").HasMaxLength(200).IsRequired();
        b.Property(x => x.Year).HasColumnName("year").IsRequired();
        b.Property(x => x.Set).HasColumnName("card_set").HasMaxLength(200).IsRequired();
        b.Property(x => x.Parallel).HasColumnName("parallel").HasMaxLength(100);
        b.Property(x => x.Numbered).HasColumnName("numbered").HasDefaultValue(false);
        b.Property(x => x.SerialNumber).HasColumnName("serial_number").HasMaxLength(50);
        b.Property(x => x.Graded).HasColumnName("graded").HasDefaultValue(false);
        b.Property(x => x.GradingCompany).HasColumnName("grading_company").HasMaxLength(50);
        b.Property(x => x.GradeValue).HasColumnName("grade_value").HasMaxLength(20);
        b.Property(x => x.Condition).HasColumnName("condition").HasMaxLength(50);
        b.Property(x => x.Price).HasColumnName("price").HasColumnType("numeric(18,2)").IsRequired();
        b.Property(x => x.ListingFormat).HasColumnName("listing_format").HasConversion<string>().IsRequired();
        b.Property(x => x.Status).HasColumnName("status").HasConversion<string>().IsRequired();
        b.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
        b.Property(x => x.UpdatedAt).HasColumnName("updated_at").IsRequired();

        b.HasIndex(x => x.Status).HasDatabaseName("idx_listings_status");
        b.HasIndex(x => x.SellerId).HasDatabaseName("idx_listings_seller");
        b.HasIndex(x => new { x.Player, x.Team, x.Year, x.Set }).HasDatabaseName("idx_listings_search");
        b.HasIndex(x => x.Price).HasDatabaseName("idx_listings_price");
        b.HasIndex(x => new { x.ListingFormat, x.Status }).HasDatabaseName("idx_listings_format_status");
        b.HasIndex(x => new { x.Status, x.ListingFormat, x.Player }).HasDatabaseName("idx_listings_composite");
    }
}