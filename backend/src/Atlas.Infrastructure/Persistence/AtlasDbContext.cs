using Atlas.Domain;
using Atlas.Domain.Users;
using Atlas.Domain.Listings;
using Atlas.Domain.Sellers;
using Atlas.Domain.Auctions;
using Atlas.Domain.Orders;
using Atlas.Domain.Messages;
using Atlas.Domain.Reviews;
using Atlas.Domain.Pricing;
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

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(AtlasDbContext).Assembly);
    }
}