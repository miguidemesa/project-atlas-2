using Atlas.Domain.Wallet;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Atlas.Infrastructure.Persistence.Configurations;

public class WalletEntryConfiguration : IEntityTypeConfiguration<WalletEntry>
{
    public void Configure(EntityTypeBuilder<WalletEntry> b)
    {
        b.ToTable("wallet_entries");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).HasColumnName("id");
        b.Property(x => x.UserId).HasColumnName("user_id").IsRequired();
        b.Property(x => x.Delta).HasColumnName("delta").HasColumnType("numeric(18,2)").IsRequired();
        b.Property(x => x.Kind).HasColumnName("kind").HasMaxLength(20).IsRequired();
        b.Property(x => x.OrderId).HasColumnName("order_id");
        b.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
        b.HasIndex(x => x.UserId).HasDatabaseName("idx_wallet_user");
        b.HasOne<Infrastructure.Authentication.AppUser>()
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .HasConstraintName("fk_wallet_entries_user")
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class PayoutRequestConfiguration : IEntityTypeConfiguration<PayoutRequest>
{
    public void Configure(EntityTypeBuilder<PayoutRequest> b)
    {
        b.ToTable("payout_requests");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).HasColumnName("id");
        b.Property(x => x.UserId).HasColumnName("user_id").IsRequired();
        b.Property(x => x.Amount).HasColumnName("amount").HasColumnType("numeric(18,2)").IsRequired();
        b.Property(x => x.Method).HasColumnName("method").HasMaxLength(10).IsRequired();
        b.Property(x => x.Destination).HasColumnName("destination").HasMaxLength(200).IsRequired();
        b.Property(x => x.Status).HasColumnName("status").HasMaxLength(10).IsRequired();
        b.Property(x => x.AdminNote).HasColumnName("admin_note").HasMaxLength(500);
        b.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
        b.Property(x => x.ProcessedAt).HasColumnName("processed_at");
        b.HasIndex(x => new { x.UserId, x.Status }).HasDatabaseName("idx_payouts_user");
        b.HasOne<Infrastructure.Authentication.AppUser>()
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .HasConstraintName("fk_payout_requests_user")
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class DisputeConfiguration : IEntityTypeConfiguration<Domain.Disputes.Dispute>
{
    public void Configure(EntityTypeBuilder<Domain.Disputes.Dispute> b)
    {
        b.ToTable("disputes");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).HasColumnName("id");
        b.Property(x => x.OrderId).HasColumnName("order_id").IsRequired();
        b.Property(x => x.OpenedBy).HasColumnName("opened_by").IsRequired();
        b.Property(x => x.Reason).HasColumnName("reason").HasMaxLength(1000).IsRequired();
        b.Property(x => x.Status).HasColumnName("status").HasMaxLength(20).IsRequired();
        b.Property(x => x.ResolutionNote).HasColumnName("resolution_note").HasMaxLength(500);
        b.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
        b.Property(x => x.ResolvedAt).HasColumnName("resolved_at");
        b.HasIndex(x => x.Status).HasDatabaseName("idx_disputes_status");
    }
}
