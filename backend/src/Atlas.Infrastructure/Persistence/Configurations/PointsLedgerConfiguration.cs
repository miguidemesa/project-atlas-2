using Atlas.Domain.Rewards;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Atlas.Infrastructure.Persistence.Configurations;

public class PointsLedgerConfiguration : IEntityTypeConfiguration<PointsLedger>
{
    public void Configure(EntityTypeBuilder<PointsLedger> b)
    {
        b.ToTable("points_ledger");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).HasColumnName("id");
        b.Property(x => x.UserId).HasColumnName("user_id").IsRequired();
        b.Property(x => x.Delta).HasColumnName("delta").IsRequired();
        b.Property(x => x.Kind).HasColumnName("kind").HasMaxLength(30).IsRequired();
        b.Property(x => x.OrderId).HasColumnName("order_id");
        b.Property(x => x.ExpiresAt).HasColumnName("expires_at");
        b.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();

        b.HasIndex(x => new { x.UserId, x.ExpiresAt }).HasDatabaseName("idx_points_user_expiry");

        b.HasOne<Infrastructure.Authentication.AppUser>()
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .HasConstraintName("fk_points_ledger_user")
            .OnDelete(DeleteBehavior.Cascade);
    }
}
