using System.Security.Cryptography;
using Atlas.Domain.Auctions;
using Atlas.Domain.Listings;
using Atlas.Domain.Pricing;
using Atlas.Infrastructure.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Atlas.Infrastructure.Persistence;

/// <summary>
/// Development seeder (source = 'seed' provenance on every row). Runs once
/// when the listings table is empty. Mirrors the mockup dataset in
/// frontend/src/lib/data.ts so the UI transition is seamless.
/// </summary>
public static class DbSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        var db = services.GetRequiredService<AtlasDbContext>();
        if (await db.Listings.AnyAsync())
            return;

        var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger("DbSeeder");
        var userManager = services.GetRequiredService<UserManager<AppUser>>();

        var now = DateTime.UtcNow;
        var hoursFromNow = (double h) => now.AddHours(h);
        var daysAgo = (int d) => now.AddDays(-d);

        var devPassword = "DevCollect0r!";
        var sellerSeeds = new (Guid Id, string Name)[]
        {
            (new Guid("5f0c2e64-0001-4a11-9c1a-000000000001"), "Kolektib & Co."),
            (new Guid("5f0c2e64-0002-4a11-9c1a-000000000002"), "Slab Hunter MNL"),
            (new Guid("5f0c2e64-0003-4a11-9c1a-000000000003"), "Hooper Manila"),
            (new Guid("5f0c2e64-0004-4a11-9c1a-000000000004"), "Hardwood PH"),
            (new Guid("5f0c2e64-0005-4a11-9c1a-000000000005"), "Three-Point Cebu"),
        };

        foreach (var (id, name) in sellerSeeds)
        {
            var email = $"{id.ToString()[..8]}@seed.atlas.local";
            var user = await userManager.FindByEmailAsync(email);
            if (user is null)
            {
                user = new AppUser
                {
                    Id = id,
                    UserName = email,
                    Email = email,
                    Name = name,
                    Role = "seller",
                    CreatedAt = daysAgo(900),
                };
                var result = await userManager.CreateAsync(user, devPassword);
                if (!result.Succeeded)
                {
                    logger.LogWarning("Seed user {Email} failed: {Errors}", email, string.Join(", ", result.Errors.Select(e => e.Description)));
                }
            }

            db.SellerProfiles.Add(new Domain.Sellers.SellerProfile
            {
                UserId = id,
                DisplayName = name,
                RatingAvg = 4.7m,
                RatingCount = 120,
                SoldCount = 300,
                JoinedDate = daysAgo(800),
                VerificationBadge = true,
            });
        }

        var s1 = sellerSeeds[0].Id;
        var s2 = sellerSeeds[1].Id;
        var s3 = sellerSeeds[2].Id;
        var s4 = sellerSeeds[3].Id;
        var s5 = sellerSeeds[4].Id;

        var listingSeeds = new (string Id, string Category, string Title, string Player, string Team, int Year, string Set, string? Parallel, bool Numbered, string? Serial, bool Graded, string? GradingCompany, string? GradeValue, string? Condition, ListingType Type, ListingFormat Format, decimal Price, decimal? CurrentBid, int BidCount, double EndsInHours, int CreatedDaysAgo, Guid SellerId, string Description)[]
        {
            ("l01","nba","Victor Wembanyama 2023-24 Prizm Silver RC","Victor Wembanyama","San Antonio Spurs",2023,"Prizm","Silver",false,null,false,null,null,null,ListingType.SingleCard,ListingFormat.Auction,28000,26500,14,2.4,4,s4,"Fresh from a hobby case. Centered with strong corners — looks gem out of the pack."),
            ("l02","nba","LeBron James 2019 Contenders Cracked Ice /23","LeBron James","Los Angeles Lakers",2019,"Contenders","Cracked Ice",true,"11/23",true,"PSA","9",null,ListingType.SingleCard,ListingFormat.FixedPrice,42000,null,0,0,2,s2,"Numbered cracked ice of the GOAT, slabbed PSA 9. Serial 11/23."),
            ("l03","nba","Stephen Curry 2016 Select Courtside Gold /10","Stephen Curry","Golden State Warriors",2016,"Select","Courtside Gold",true,"07/10",false,null,null,null,ListingType.SingleCard,ListingFormat.FixedPrice,38500,null,0,0,6,s1,"Gold parallel from the title-season sets. Sharp corners, minor back edge wear — priced accordingly."),
            ("l04","nba","Paolo Banchero Rookie Lot (5)","Paolo Banchero","Orlando Magic",2022,"Crown Royale",null,false,null,false,null,null,null,ListingType.Lot,ListingFormat.FixedPrice,8500,null,0,0,1,s3,"Five-card rookie lot: base, silver, two retail parallels and an insert."),
            ("l05","nba","2023-24 NBA Hoops Hobby Box (Sealed)","Multi-player","Various",2023,"NBA Hoops",null,false,null,false,null,null,null,ListingType.HobbyBox,ListingFormat.FixedPrice,6500,null,0,0,3,s5,"Sealed hobby box, Winter release. Two autos or relics per box on average."),
            ("l06","nba","Anthony Edwards 2020 Prizm RC PSA 10","Anthony Edwards","Minnesota Timberwolves",2020,"Prizm",null,false,null,true,"PSA","10",null,ListingType.SingleCard,ListingFormat.Auction,55000,48000,22,0.8,7,s1,"The Ant rookie in a gem-mint slab. Clean surfaces, perfect centering."),
            ("l07","nba","Luka Dončić 2018 Optic Holo /99","Luka Dončić","Dallas Mavericks",2018,"Donruss Optic","Holo",true,"52/99",false,null,null,null,ListingType.SingleCard,ListingFormat.FixedPrice,18500,null,0,0,5,s2,"Holo parallel of the 2018 ROY. Numbered /99 with vivid refraction."),
            ("l08","nba","Jordan Clarkson Rise N Grade Crusade","Jordan Clarkson","Utah Jazz",2023,"Rise N Grade","Crusade",false,null,false,null,null,null,ListingType.SingleCard,ListingFormat.FixedPrice,3200,null,0,0,1,s3,"Clarkson Crusade from his Sixth Man of the Year run."),
            ("l09","nba","Giannis Antetokounmpo 2013 Prizm RC BGS 9.5","Giannis Antetokounmpo","Milwaukee Bucks",2013,"Prizm",null,false,null,true,"BGS","9.5",null,ListingType.SingleCard,ListingFormat.Auction,120000,98000,31,9,9,s4,"The Greek Freak's true rookie, BGS 9.5 with two 9.5 subgrades."),
            ("l10","nba","Kobe Bryant UD First Edition LOT of 12","Kobe Bryant","Los Angeles Lakers",2007,"Upper Deck First Edition",null,false,null,false,null,null,null,ListingType.Lot,ListingFormat.FixedPrice,12500,null,0,0,8,s1,"Twelve Kobe base cards across 2007-09 Upper Deck releases."),
            ("l11","nba","Card Storage Bundle: 500 Sleeves + 25 Toploaders","Supplies","—",2024,"—",null,false,null,false,null,null,null,ListingType.Accessory,ListingFormat.FixedPrice,850,null,0,0,2,s5,"Penny sleeves plus premium toploaders. Standard 2.5x3.5 fit."),
            ("l12","nba","Chet Holmgren Mosaic Reactive Orange","Chet Holmgren","Oklahoma City Thunder",2023,"Mosaic","Reactive Orange",false,null,false,null,null,null,ListingType.SingleCard,ListingFormat.FixedPrice,4200,null,0,0,3,s3,"Reactive orange of OKC's unicorn. Eye appeal for days at this price point."),
            ("l13","nba","Scottie Barnes Court Kings Fresh Paint RC","Scottie Barnes","Toronto Raptors",2021,"Court Kings","Fresh Paint",false,null,false,null,null,null,ListingType.SingleCard,ListingFormat.Auction,6000,5400,9,26,4,s2,"Painterly Fresh Paint rookie of the 2022 ROY."),
            ("l14","nba","Tyrese Haliburton Illusions Rookie Auto","Tyrese Haliburton","Indiana Pacers",2020,"Illusions",null,false,null,false,null,null,"Near Mint",ListingType.SingleCard,ListingFormat.FixedPrice,9800,null,0,0,5,s1,"On-card auto from Hali's rookie year in Indiana."),
            ("l15","pokemon","Charizard Base Set PSA 9","Charizard","Kanto",1999,"Base Set",null,false,null,true,"PSA","9",null,ListingType.SingleCard,ListingFormat.Auction,185000,168000,38,31,10,s4,"The king of vintage Pokémon. Strong gloss for the grade."),
            ("l16","pokemon","Pikachu ex Surging Sparks SIR","Pikachu ex","Paldea",2024,"Surging Sparks","Special Illustration Rare",false,null,false,null,null,null,ListingType.SingleCard,ListingFormat.FixedPrice,4200,null,0,0,1,s3,"The chase card of the set, pulled fresh from an ETB."),
            ("l17","pokemon","Giratina Platinum Holo Rare","Giratina","Sinnoh",2009,"Platinum","Holo",false,null,false,null,null,null,ListingType.SingleCard,ListingFormat.FixedPrice,2600,null,0,0,6,s2,"Original Sinnoh-era holo with vivid pattern; light scratching under direct light."),
            ("l18","one_piece","Shanks OP-02 Paramount War SEC","Shanks","Red Hair Pirates",2023,"Paramount War","Special Commander",false,null,false,null,null,null,ListingType.SingleCard,ListingFormat.FixedPrice,22000,null,0,0,3,s1,"SEC alt-art of the Emperor himself. Japanese print."),
            ("l19","one_piece","Monkey D. Luffy ST-08 Alternate Art","Monkey D. Luffy","Straw Hat Crew",2023,"Ultra Deck","Alt Art",false,null,false,null,null,null,ListingType.SingleCard,ListingFormat.FixedPrice,5800,null,0,0,2,s5,"Gear-powered Luffy alt art from the starter decks."),
            ("l20","one_piece","Nami OP-05 Manga Rare","Nami","Straw Hat Crew",2024,"Awakening","Manga Rare",false,null,false,null,null,null,ListingType.SingleCard,ListingFormat.FixedPrice,3200,null,0,0,4,s3,"Manga-texture rare from OP-05."),
            ("l21","disney","Mickey Mouse Lorcana Enchanted","Mickey Mouse","Inklands",2023,"The First Chapter","Enchanted",false,null,false,null,null,null,ListingType.SingleCard,ListingFormat.Auction,28000,24500,17,6,8,s2,"Brave Little Tailor enchanted — pulled first-hand, sleeved immediately."),
            ("l22","disney","Elsa Lorcana Super Rare","Elsa","Arendelle",2024,"Into the Inklands","Foil",false,null,false,null,null,null,ListingType.SingleCard,ListingFormat.FixedPrice,12500,null,0,0,5,s1,"Snow Queen foil with full-art treatment."),
            ("l23","disney","Lorcana Stitch Playmat (Official)","Stitch","—",2024,"Accessories",null,false,null,false,null,null,null,ListingType.Accessory,ListingFormat.FixedPrice,750,null,0,0,1,s5,"Official rubber-backed playmat. Tournament legal, stitched edges."),
        };

        foreach (var t in listingSeeds)
        {
            var id = DeterministicGuid(t.Id);
            db.Listings.Add(new Listing
            {
                Id = id,
                SellerId = t.SellerId,
                Sport = t.Category,
                Type = t.Type,
                Title = t.Title,
                Description = t.Description + " Ships bubble-wrapped with tracking anywhere in PH.",
                Player = t.Player,
                Team = t.Team,
                Year = t.Year,
                Set = t.Set,
                Parallel = t.Parallel,
                Numbered = t.Numbered,
                SerialNumber = t.Serial,
                Graded = t.Graded,
                GradingCompany = t.GradingCompany,
                GradeValue = t.GradeValue,
                Condition = t.Condition,
                Price = t.Price,
                ListingFormat = t.Format,
                Status = ListingStatus.Active,
                CreatedAt = daysAgo(t.CreatedDaysAgo),
                UpdatedAt = now,
            });

            if (t.Format == ListingFormat.Auction)
            {
                db.Auctions.Add(new Auction
                {
                    ListingId = id,
                    StartPrice = Math.Round(t.Price * 0.85m),
                    CurrentBid = t.CurrentBid,
                    EndTime = hoursFromNow(t.EndsInHours),
                    Status = AuctionStatus.Active,
                });

                // bid-count rows so counts are real (amounts below current bid)
                for (var b = 0; b < t.BidCount; b++)
                {
                    db.Bids.Add(new Bid
                    {
                        Id = Guid.NewGuid(),
                        ListingId = id,
                        BidderId = sellerSeeds[b % sellerSeeds.Length].Id,
                        Amount = (t.CurrentBid ?? t.Price) - ((t.BidCount - b) * 500m),
                        CreatedAt = daysAgo(t.CreatedDaysAgo).AddHours(b),
                    });
                }
            }

            AppendHistory(db, id.ToString(), t.CurrentBid ?? t.Price);
        }

        await db.SaveChangesAsync();
        logger.LogInformation("Seeded {Sellers} seller profiles and {Listings} listings (source='seed').",
            sellerSeeds.Length, listingSeeds.Length);
    }

    private static void AppendHistory(AtlasDbContext db, string cardKey, decimal endPrice)
    {
        var rand = Random.Shared;
        const int n = 30;
        for (var i = n; i >= 0; i--)
        {
            var trend = 1 - (i / (decimal)n) * (endPrice > 10000 ? 0.10m : 0.05m);
            var drift = 1 + (((decimal)rand.NextDouble() - 0.48m) * 0.06m * (i / (decimal)n));
            db.PriceHistory.Add(new PriceHistory
            {
                Id = Guid.NewGuid(),
                CardIdentityKey = cardKey,
                SalePrice = Math.Round(endPrice * trend * drift, 2),
                SaleDate = DateTime.UtcNow.AddDays(-i),
                Source = "seed",
            });
        }
    }

    private static Guid DeterministicGuid(string key)
    {
        var hash = SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(key));
        return new Guid(hash.Take(16).ToArray());
    }
}
