using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Atlas.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddForeignKeysAndConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_auctions_listings_listing_id",
                table: "auctions");

            migrationBuilder.DropForeignKey(
                name: "FK_listing_photos_listings_listing_id",
                table: "listing_photos");

            migrationBuilder.DropForeignKey(
                name: "FK_seller_profiles_aspnet_users_user_id",
                table: "seller_profiles");

            migrationBuilder.AlterColumn<Guid>(
                name: "listing_id",
                table: "messages",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.CreateIndex(
                name: "IX_reviews_reviewer_id",
                table: "reviews",
                column: "reviewer_id");

            migrationBuilder.CreateIndex(
                name: "uq_refresh_tokens_token_hash",
                table: "refresh_tokens",
                column: "token_hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_orders_listing_id",
                table: "orders",
                column: "listing_id");

            migrationBuilder.AddForeignKey(
                name: "fk_auctions_listings",
                table: "auctions",
                column: "listing_id",
                principalTable: "listings",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_bids_bidder",
                table: "bids",
                column: "bidder_id",
                principalTable: "aspnet_users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_bids_listings",
                table: "bids",
                column: "listing_id",
                principalTable: "listings",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_listing_photos_listings",
                table: "listing_photos",
                column: "listing_id",
                principalTable: "listings",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_messages_listings",
                table: "messages",
                column: "listing_id",
                principalTable: "listings",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_messages_recipient",
                table: "messages",
                column: "recipient_id",
                principalTable: "aspnet_users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_messages_sender",
                table: "messages",
                column: "sender_id",
                principalTable: "aspnet_users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_orders_buyer",
                table: "orders",
                column: "buyer_id",
                principalTable: "aspnet_users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_orders_listings",
                table: "orders",
                column: "listing_id",
                principalTable: "listings",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_orders_seller",
                table: "orders",
                column: "seller_id",
                principalTable: "aspnet_users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_refresh_tokens_user",
                table: "refresh_tokens",
                column: "user_id",
                principalTable: "aspnet_users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_reviews_orders",
                table: "reviews",
                column: "order_id",
                principalTable: "orders",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_reviews_reviewee",
                table: "reviews",
                column: "reviewee_id",
                principalTable: "aspnet_users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_reviews_reviewer",
                table: "reviews",
                column: "reviewer_id",
                principalTable: "aspnet_users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_seller_profiles_user",
                table: "seller_profiles",
                column: "user_id",
                principalTable: "aspnet_users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_auctions_listings",
                table: "auctions");

            migrationBuilder.DropForeignKey(
                name: "fk_bids_bidder",
                table: "bids");

            migrationBuilder.DropForeignKey(
                name: "fk_bids_listings",
                table: "bids");

            migrationBuilder.DropForeignKey(
                name: "fk_listing_photos_listings",
                table: "listing_photos");

            migrationBuilder.DropForeignKey(
                name: "fk_messages_listings",
                table: "messages");

            migrationBuilder.DropForeignKey(
                name: "fk_messages_recipient",
                table: "messages");

            migrationBuilder.DropForeignKey(
                name: "fk_messages_sender",
                table: "messages");

            migrationBuilder.DropForeignKey(
                name: "fk_orders_buyer",
                table: "orders");

            migrationBuilder.DropForeignKey(
                name: "fk_orders_listings",
                table: "orders");

            migrationBuilder.DropForeignKey(
                name: "fk_orders_seller",
                table: "orders");

            migrationBuilder.DropForeignKey(
                name: "fk_refresh_tokens_user",
                table: "refresh_tokens");

            migrationBuilder.DropForeignKey(
                name: "fk_reviews_orders",
                table: "reviews");

            migrationBuilder.DropForeignKey(
                name: "fk_reviews_reviewee",
                table: "reviews");

            migrationBuilder.DropForeignKey(
                name: "fk_reviews_reviewer",
                table: "reviews");

            migrationBuilder.DropForeignKey(
                name: "fk_seller_profiles_user",
                table: "seller_profiles");

            migrationBuilder.DropIndex(
                name: "IX_reviews_reviewer_id",
                table: "reviews");

            migrationBuilder.DropIndex(
                name: "uq_refresh_tokens_token_hash",
                table: "refresh_tokens");

            migrationBuilder.DropIndex(
                name: "IX_orders_listing_id",
                table: "orders");

            migrationBuilder.AlterColumn<Guid>(
                name: "listing_id",
                table: "messages",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_auctions_listings_listing_id",
                table: "auctions",
                column: "listing_id",
                principalTable: "listings",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_listing_photos_listings_listing_id",
                table: "listing_photos",
                column: "listing_id",
                principalTable: "listings",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_seller_profiles_aspnet_users_user_id",
                table: "seller_profiles",
                column: "user_id",
                principalTable: "aspnet_users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
