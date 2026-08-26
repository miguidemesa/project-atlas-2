using Atlas.Domain.Auctions;
using Atlas.Domain.Listings;
using Atlas.Domain.Messages;
using Atlas.Domain.Offers;
using Atlas.Domain.Orders;
using Atlas.Domain.Pricing;
using Atlas.Domain.Disputes;
using Atlas.Domain.Reviews;
using Atlas.Domain.Wallet;
using Atlas.Domain.Sellers;
using Atlas.Domain.Rewards;
using Atlas.Infrastructure.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Atlas.Infrastructure.Persistence;

public class AtlasDbContext(DbContextOptions<AtlasDbContext> options)
    : IdentityDbContext<AppUser, IdentityRole<Guid>, Guid>(options)
{
    public DbSet<Listing> Listings => Set<Listing>();
    public DbSet<ListingPhoto> ListingPhotos => Set<ListingPhoto>();
    public DbSet<SellerProfile> SellerProfiles => Set<SellerProfile>();
    public DbSet<Auction> Auctions => Set<Auction>();
    public DbSet<Bid> Bids => Set<Bid>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<PriceHistory> PriceHistory => Set<PriceHistory>();
    public DbSet<RefreshTokenEntity> RefreshTokens => Set<RefreshTokenEntity>();
    public DbSet<Offer> Offers => Set<Offer>();
    public DbSet<PointsLedger> PointsLedger => Set<PointsLedger>();
    public DbSet<WalletEntry> WalletEntries => Set<WalletEntry>();
    public DbSet<PayoutRequest> PayoutRequests => Set<PayoutRequest>();
    public DbSet<Dispute> Disputes => Set<Dispute>();

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        // dev convenience: allow `database update` when the snapshot races ahead
        optionsBuilder.ConfigureWarnings(w =>
            w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(AtlasDbContext).Assembly);
    }
}
