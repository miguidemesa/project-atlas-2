using Atlas.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;

namespace Atlas.Tests.Api;

/// <summary>Uses its own database so it can stop the schema at the previous migration.</summary>
public class ListingMigrationTests
{
    private const string PreviousMigration = "20260826103752_AddWalletPayoutsDisputes";

    private sealed class Row
    {
        public string Title { get; set; } = "";
        public string Category { get; set; } = "";
        public string? Condition { get; set; }
        public string? Team { get; set; }
        public string Language { get; set; } = "";
    }

    [Fact]
    public async Task Legacy_Listings_Map_To_New_Categories_Conditions_And_Teams()
    {
        var cs = new NpgsqlConnectionStringBuilder(ApiFactory.ConnectionString) { Database = "atlas_test_migration" }.ConnectionString;
        ApiFactory.EnsureDisposableDatabase(cs);
        await using var db = new AtlasDbContext(new DbContextOptionsBuilder<AtlasDbContext>().UseNpgsql(cs).Options);
        await db.Database.EnsureDeletedAsync();
        var migrator = db.GetService<IMigrator>();
        await migrator.MigrateAsync(PreviousMigration);

        Guid a = Guid.NewGuid(), b = Guid.NewGuid(), seller = Guid.NewGuid();
        await db.Database.ExecuteSqlAsync($"""
            INSERT INTO listings (id, seller_id, type, title, sport, player, team, year, card_set, price, listing_format, status, condition, created_at, updated_at)
            VALUES ({a}, {seller}, 'SingleCard', 'a NBA', 'nba', 'LeBron James', 'Lakers', 2019, 'Prizm', 100, 'FixedPrice', 'Active', 'Near Mint', now(), now()),
                   ({b}, {seller}, 'SingleCard', 'b Lorcana', 'disney', 'Elsa', '—', 2024, 'Inklands', 100, 'FixedPrice', 'Active', 'Lightly Played', now(), now())
            """);

        await migrator.MigrateAsync();

        var rows = await db.Database
            .SqlQueryRaw<Row>("""SELECT title AS "Title", category AS "Category", condition AS "Condition", team AS "Team", language AS "Language" FROM listings ORDER BY title""")
            .ToListAsync();

        rows.Should().BeEquivalentTo(new[]
        {
            new Row { Title = "a NBA", Category = "basketball", Condition = "NM", Team = "Lakers", Language = "en" },
            new Row { Title = "b Lorcana", Category = "lorcana", Condition = "LP", Team = null, Language = "en" },
        });

        await db.Database.EnsureDeletedAsync();
    }
}
