# Database — PostgreSQL Schema Overview

The application uses a single PostgreSQL database, `atlas_marketplace`, managed by Entity Framework Core migrations. All schema changes must go through an EF Core migration — never modify production schema directly.

This document summarizes the key tables. The EF Core configurations and
migrations in `backend/src/Atlas.Infrastructure` define the current schema,
indexes and constraints.

## Conventions

- `snake_case` table and column names.
- Plural table names.
- `Guid` primary keys.
- Foreign keys named `fk_{table}_{referenced}`.
- Money is `decimal(18,2)` PHP — never floating-point for financial values.
- Timestamps stored as UTC `DateTime`.
- Seed data is marked `source = 'seed'` and never mixed with real transaction data.

## Key Tables

### `users` / `aspnet_users` (Identity)

Extends ASP.NET Core Identity (`IdentityUser<Guid>`). The user row is the source of truth for identity. Key columns: `id`, `email`, `name`, `phone`, `role` (`buyer` | `seller` | `both`), `is_email_verified`, `created_at`, `updated_at`.

### `seller_profiles`

1:1 with a user. Public seller identity and computed trust signals. Key columns: `user_id` (PK/FK), `display_name`, `rating_avg` (`decimal(3,2)`), `rating_count`, `sold_count`, `joined_date`, `verification_badge`. Rating fields are computed **server-side only**.

### `listings`

The core marketplace entity. Key columns: `id`, `seller_id` (FK), `type` (`single_card` | `lot` | `hobby_box` | `accessory`), `title`, `description`, `sport`, `player`, `team`, `year`, `set`, `parallel`, `numbered`, `serial_number`, `graded`, `grading_company`, `grade_value`, `condition`, `price`, `listing_format` (`fixed_price` | `auction`), `status` (`draft` | `active` | `sold` | `ended` | `cancelled`), `created_at`, `updated_at`.

`listing_photos`: child table, cascade-deleted with the listing. Key columns: `id`, `listing_id`, `storage_key`, `url`, `sort_order`.

### `auctions`

1:1 with a listing where `listing_format = auction`. Key columns: `listing_id` (PK/FK), `start_price`, `current_bid`, `current_bidder_id` (FK), `end_time`, `auto_extend_minutes` (default 5), `status` (`pending` | `active` | `ended_sold` | `ended_no_sale`).

### `bids`

Key columns: `id`, `listing_id` (FK), `bidder_id` (FK), `amount`, `created_at`. Bids are validated atomically (DB transactions, row-level locking) — a seller cannot bid on their own listing, and expired auctions reject bids.

### `orders`

Created in later phases. Key columns: `buyer_id` (FK), `seller_id` (FK), `status` (`pending_payment` → `delivered_confirmed` → `funds_released`, plus dispute/cancel/refund states).

### `reviews`

Key columns: `reviewer_id` (FK), `seller_id` (FK), `order_id` (FK), `rating` (1–5), `comment`. Constrained to eligible transactions; unique per `(order_id, reviewer_id)`; users cannot review themselves; ratings computed server-side.

### `price_history`

Key columns: `card_identity_key`, `sale_price`, `sale_date`, `source` (`seed` | `internal_transaction`). Aggregated per card using `card_identity_key` — a normalized `{player}|{year}|{set}|{parallel}|{grade}` value computed server-side.

### `refresh_tokens`

Key columns: `user_id` (FK), `token_hash` (SHA-256, never raw), `expires_at`, `created_at`, `revoked_at`. Used for JWT refresh rotation and revocation.

## Indexes (Phase 0–3 priorities)

```sql
CREATE INDEX idx_listings_status_created ON listings (status, created_at DESC);
CREATE INDEX idx_listings_seller ON listings (seller_id);
CREATE INDEX idx_listings_search ON listings (player, team, year, set);
CREATE INDEX idx_listings_price ON listings (price);
CREATE INDEX idx_listings_format_status ON listings (listing_format, status);
CREATE INDEX idx_auctions_endtime ON auctions (status, end_time);
CREATE INDEX idx_bids_listing_amount ON bids (listing_id, amount DESC);
CREATE INDEX idx_pricehistory_key_date ON price_history (card_identity_key, sale_date DESC);
CREATE INDEX idx_orders_buyer ON orders (buyer_id, status);
CREATE INDEX idx_orders_seller ON orders (seller_id, status);
CREATE INDEX idx_refreshtokens_user ON refresh_tokens (user_id, token_hash);
CREATE INDEX idx_refreshtokens_expiry ON refresh_tokens (expires_at);
```

## Constraints

```sql
ALTER TABLE listings ADD CONSTRAINT chk_price_positive CHECK (price >= 0);
ALTER TABLE auctions ADD CONSTRAINT chk_startprice_positive CHECK (start_price >= 0);
ALTER TABLE reviews ADD CONSTRAINT chk_rating_range CHECK (rating BETWEEN 1 AND 5);
CREATE UNIQUE INDEX uq_review_per_order ON reviews (order_id, reviewer_id);
```

## Seed Data

On first run in Development with an empty DB: 6 users (2 sellers, 3 buyers, 1 both), 2 seller profiles, ~50 realistic NBA card listings (LeBron, Jordan, Kobe, Curry, Luka, Giannis, etc.; Prizm/Topps Chrome/Select/Mosaic sets; fixed + auction formats; some auctions ending soon), ~200 price history records (`source = 'seed'`), and sample reviews.
