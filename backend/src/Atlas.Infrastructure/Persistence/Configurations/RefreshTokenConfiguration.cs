using Atlas.Infrastructure.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Atlas.Infrastructure.Persistence.Configurations;

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshTokenEntity>
{
    public void Configure(EntityTypeBuilder<RefreshTokenEntity> b)
    {
        b.ToTable("refresh_tokens");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).HasColumnName("id");
        b.Property(x => x.UserId).HasColumnName("user_id").IsRequired();
        b.Property(x => x.TokenHash).HasColumnName("token_hash").HasMaxLength(500).IsRequired();
        b.Property(x => x.ExpiresAt).HasColumnName("expires_at").IsRequired();
        b.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
        b.Property(x => x.RevokedAt).HasColumnName("revoked_at");

        b.HasIndex(x => x.TokenHash).IsUnique().HasDatabaseName("uq_refresh_tokens_token_hash");
        b.HasIndex(x => new { x.UserId, x.TokenHash }).HasDatabaseName("idx_refreshtokens_user");
        b.HasIndex(x => x.ExpiresAt).HasDatabaseName("idx_refreshtokens_expiry");

        b.HasOne<Atlas.Infrastructure.Authentication.AppUser>()
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .HasConstraintName("fk_refresh_tokens_user")
            .OnDelete(DeleteBehavior.Cascade);
    }
}