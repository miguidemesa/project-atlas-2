using Atlas.Domain.Sellers;
using Atlas.Infrastructure.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Atlas.Infrastructure.Persistence.Configurations;

public class SellerProfileConfiguration : IEntityTypeConfiguration<SellerProfile>
{
    public void Configure(EntityTypeBuilder<SellerProfile> b)
    {
        b.ToTable("seller_profiles");
        b.HasKey(x => x.UserId);
        b.Property(x => x.UserId).HasColumnName("user_id").IsRequired();
        b.Property(x => x.DisplayName).HasColumnName("display_name").HasMaxLength(100).IsRequired();
        b.Property(x => x.RatingAvg).HasColumnName("rating_avg").HasColumnType("numeric(3,2)").HasDefaultValue(0m);
        b.Property(x => x.RatingCount).HasColumnName("rating_count").HasDefaultValue(0);
        b.Property(x => x.SoldCount).HasColumnName("sold_count").HasDefaultValue(0);
        b.Property(x => x.JoinedDate).HasColumnName("joined_date").IsRequired();
        b.Property(x => x.VerificationBadge).HasColumnName("verification_badge").HasDefaultValue(false);

        b.HasOne<AppUser>()
            .WithOne()
            .HasForeignKey<SellerProfile>(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}