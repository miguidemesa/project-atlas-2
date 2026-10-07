using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Atlas.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class GeneralizeListingsForAllGames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(name: "sport", table: "listings", newName: "category");

            migrationBuilder.AlterColumn<string>(
                name: "category", table: "listings", type: "character varying(50)", maxLength: 50, nullable: false,
                oldClrType: typeof(string), oldType: "character varying(50)", oldMaxLength: 50, oldDefaultValue: "basketball");

            migrationBuilder.AlterColumn<int>(
                name: "year", table: "listings", type: "integer", nullable: true,
                oldClrType: typeof(int), oldType: "integer");

            migrationBuilder.AlterColumn<string>(
                name: "team", table: "listings", type: "character varying(200)", maxLength: 200, nullable: true,
                oldClrType: typeof(string), oldType: "character varying(200)", oldMaxLength: 200);

            migrationBuilder.AddColumn<string>(
                name: "card_number", table: "listings", type: "character varying(30)", maxLength: 30, nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "language", table: "listings", type: "character varying(10)", maxLength: 10, nullable: false, defaultValue: "en");

            migrationBuilder.AddColumn<int>(
                name: "view_count", table: "listings", type: "integer", nullable: false, defaultValue: 0);

            // legacy rows -> the shared category list, condition codes, no fake teams
            migrationBuilder.Sql("UPDATE listings SET category = 'basketball' WHERE category = 'nba';");
            migrationBuilder.Sql("UPDATE listings SET category = 'lorcana' WHERE category = 'disney';");
            migrationBuilder.Sql("UPDATE listings SET team = NULL WHERE btrim(team) IN ('', '—', '-');");
            migrationBuilder.Sql("""
                UPDATE listings SET condition = CASE condition
                    WHEN 'Near Mint' THEN 'NM'
                    WHEN 'Lightly Played' THEN 'LP'
                    WHEN 'Moderately Played' THEN 'MP'
                    WHEN 'Played' THEN 'HP'
                    WHEN 'Heavily Played' THEN 'HP'
                    WHEN 'Damaged' THEN 'DMG'
                    ELSE condition END
                WHERE condition IS NOT NULL;
                """);

            migrationBuilder.CreateIndex(
                name: "idx_listings_category_status", table: "listings", columns: new[] { "category", "status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // condition codes stay as codes: the old free-text values aren't recoverable
            migrationBuilder.DropIndex(name: "idx_listings_category_status", table: "listings");
            migrationBuilder.Sql("UPDATE listings SET category = 'nba' WHERE category = 'basketball';");
            migrationBuilder.Sql("UPDATE listings SET category = 'disney' WHERE category = 'lorcana';");
            migrationBuilder.Sql("UPDATE listings SET team = '—' WHERE team IS NULL;");
            migrationBuilder.Sql("UPDATE listings SET year = 0 WHERE year IS NULL;");
            migrationBuilder.DropColumn(name: "view_count", table: "listings");
            migrationBuilder.DropColumn(name: "language", table: "listings");
            migrationBuilder.DropColumn(name: "card_number", table: "listings");
            migrationBuilder.AlterColumn<string>(
                name: "team", table: "listings", type: "character varying(200)", maxLength: 200, nullable: false,
                oldClrType: typeof(string), oldType: "character varying(200)", oldMaxLength: 200, oldNullable: true);
            migrationBuilder.AlterColumn<int>(
                name: "year", table: "listings", type: "integer", nullable: false,
                oldClrType: typeof(int), oldType: "integer", oldNullable: true);
            migrationBuilder.AlterColumn<string>(
                name: "category", table: "listings", type: "character varying(50)", maxLength: 50, nullable: false,
                defaultValue: "basketball", oldClrType: typeof(string), oldType: "character varying(50)", oldMaxLength: 50);
            migrationBuilder.RenameColumn(name: "category", table: "listings", newName: "sport");
        }
    }
}
