# NBA Card Marketplace Philippines — Phase 0–3 Design Spec

> Date: 2026-08-04
> Scope: Foundation, Auth, Listings + Image Upload, Home Feed, Seed Data, Tests
> NOT in scope: Payments, Orders, Bids/Auctions (write), Messages, Reviews, Multi-category, Wishlist, Follow-seller, Shipping APIs, Grading/Auth

---

## 1. Architecture

**Modular monolith** — ASP.NET Core Web API (.NET 10) + EF Core + PostgreSQL 14.

```
project-atlas 2/
├── .gitignore
├── .env.example
├── docker-compose.yml           # PostgreSQL for local dev
├── README.md / ARCHITECTURE.md / DATABASE.md / API.md
├── backend/
│   ├── Atlas.sln
│   ├── src/
│   │   ├── Atlas.Domain/          entities, enums, value objects
│   │   ├── Atlas.Application/     services, DTOs, FluentValidation
│   │   ├── Atlas.Infrastructure/  EF Core, Identity, storage, email
│   │   └── Atlas.Web.Api/         controllers, middleware, DI
│   └── tests/
│       ├── Atlas.Tests.Unit/
│       ├── Atlas.Tests.Integration/
│       └── Atlas.Tests.Api/
└── frontend/
    └── (Next.js App Router — see §9)
```

### Decisions & ADRs

| Decision | Choice | Why | Tradeoff |
|---|---|---|---|
| Backend framework | ASP.NET Core 10 | Spec preference; strong typing, EF Core, robust Identity | Heavier than Node for simple CRUD; justified by domain complexity |
| Auth | Identity + JWT access/refresh | Client-agnostic; future mobile; no CSRF surface | More moving parts than cookie sessions |
| Object storage | `IObjectStorage` interface; local FS dev, S3 prod | Docker daemon not running; local FS zero-infra; prod path is real S3 | Dev/prod behavior gap; mitigated by same interface |
| Email | `IEmailSender`; console-log dev, SMTP stub | No third-party email service in Phase 0–3 | Dev flow prints links to console |
| User identity | Identity `AppUser` is the user row | Avoids dual-write; standard modular-monolith pattern | Domain layer references Identity through an abstraction |
| Money type | `decimal(18,2)` PHP | No floating-point for financial values | PostgreSQL `numeric` type |

---

## 2. Domain Model

### AppUser (Identity — extends IdentityUser\<Guid\>)

| Column | Type | Notes |
|---|---|---|
| Id | Guid (PK) | |
| Email | string | Unique, required |
| Name | string | Required |
| Phone | string? | Optional |
| Role | enum: `buyer`, `seller`, `both` | Default `buyer` |
| IsEmailVerified | bool | Mapped from `EmailConfirmed` |
| CreatedAt / UpdatedAt | DateTime (UTC) | Auto-managed |

### SellerProfile (1:1 with AppUser)

| Column | Type | Notes |
|---|---|---|
| UserId | Guid (PK, FK → AppUser) | |
| DisplayName | string | |
| RatingAvg | decimal(3,2) | Computed server-side only |
| RatingCount | int | Computed server-side only |
| SoldCount | int | Computed server-side only |
| JoinedDate | DateTime | |
| VerificationBadge | bool | Server-controlled |

### Listing

| Column | Type | Notes |
|---|---|---|
| Id | Guid (PK) | |
| SellerId | Guid (FK → AppUser) | |
| Type | enum: `single_card`, `lot`, `hobby_box`, `accessory` | |
| Title | string | Required, max 200 |
| Description | string? | Max 2000 |
| Sport | string | Default `basketball` |
| Player | string | Indexed |
| Team | string | Indexed |
| Year | int | Indexed |
| Set | string | Indexed |
| Parallel | string? | |
| Numbered | bool | |
| SerialNumber | string? | e.g. "15/25" |
| Graded | bool | |
| GradingCompany | string? | PSA, BGS, SGC |
| GradeValue | string? | "10", "9.5", etc. |
| Condition | string? | Near Mint, etc. |
| Price | decimal(18,2) | ≥ 0 |
| ListingFormat | enum: `fixed_price`, `auction` | |
| Status | enum: `draft`, `active`, `sold`, `ended`, `cancelled` | |
| CreatedAt / UpdatedAt | DateTime (UTC) | |

### ListingPhoto

| Column | Type | Notes |
|---|---|---|
| Id | Guid (PK) | |
| ListingId | Guid (FK, cascade delete) | |
| StorageKey | string | Object storage path |
| Url | string? | Computed or cached URL |
| SortOrder | int | |

### Auction (1:1 with Listing where format = auction)

| Column | Type | Notes |
|---|---|---|
| ListingId | Guid (PK, FK → Listing) | |
| StartPrice | decimal(18,2) | ≥ 0 |
| CurrentBid | decimal(18,2)? | NULL = no bids yet |
| CurrentBidderId | Guid? (FK → AppUser) | |
| EndTime | DateTime (UTC) | |
| AutoExtendMinutes | int | Default 5 |
| Status | enum: `pending`, `active`, `ended_sold`, `ended_no_sale` | |

### Bid

| Column | Type | Notes |
|---|---|---|
| Id | Guid (PK) | |
| ListingId | Guid (FK) | |
| BidderId | Guid (FK → AppUser) | |
| Amount | decimal(18,2) | |
| CreatedAt | DateTime (UTC) | |

### Order, Message, Review, PriceHistory, RefreshToken

Full schema defined in §3; entities exist in DB for Phase 0–3 but endpoints exposed only in later phases.

### CardIdentityKey

Server-computed normalized key: `{player}|{year}|{set}|{parallel}|{grade}` — used to aggregate PriceHistory across listings for the same card.

---

## 3. Database Schema & Indexes

```sql
-- Indexes (Phase 0–3 priorities)
CREATE INDEX idx_listings_status_created ON listings (status, created_at DESC);
CREATE INDEX idx_listings_seller ON listings (seller_id);
CREATE INDEX idx_listings_search ON listings (player, team, year, set);
CREATE INDEX idx_listings_price ON listings (price);
CREATE INDEX idx_listings_format_status ON listings (listing_format, status);
CREATE INDEX idx_listings复合 ON listings (status, listing_format, player);

CREATE INDEX idx_auctions_endtime ON auctions (status, end_time);
CREATE INDEX idx_bids_listing_amount ON bids (listing_id, amount DESC);
CREATE INDEX idx_pricehistory_key_date ON price_history (card_identity_key, sale_date DESC);
CREATE INDEX idx_orders_buyer ON orders (buyer_id, status);
CREATE INDEX idx_orders_seller ON orders (seller_id, status);
CREATE INDEX idx_refreshtokens_user ON refresh_tokens (user_id, token_hash);
CREATE INDEX idx_refreshtokens_expiry ON refresh_tokens (expires_at);

-- Constraints
ALTER TABLE listings ADD CONSTRAINT chk_price_positive CHECK (price >= 0);
ALTER TABLE auctions ADD CONSTRAINT chk_startprice_positive CHECK (start_price >= 0);
ALTER TABLE reviews ADD CONSTRAINT chk_rating_range CHECK (rating BETWEEN 1 AND 5);
CREATE UNIQUE INDEX uq_review_per_order ON reviews (order_id, reviewer_id);
```

---

## 4. API Design (Phase 0–3)

All endpoints return JSON. Errors use RFC 7807 ProblemDetails.

### Auth

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | /api/auth/register | — | email + name + password |
| POST | /api/auth/login | — | email + password → access + refresh tokens |
| POST | /api/auth/refresh | — | rotate refresh token |
| POST | /api/auth/logout | Bearer | revoke refresh token |
| POST | /api/auth/verify-email | — | token (from email) |
| POST | /api/auth/resend-verification | — | resend verification email |
| POST | /api/auth/forgot-password | — | email → reset token |
| POST | /api/auth/reset-password | — | token + new password |
| POST | /api/auth/google | — | Google ID token → our tokens; 503 if not configured |

Rate limit: 10/min per IP on all `/api/auth/*`.

### Users / Sellers

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /api/auth/me | Bearer | current user profile |
| PATCH | /api/users/me | Bearer | update name/phone |
| POST | /api/sellers | Bearer | become a seller (creates SellerProfile) |
| GET | /api/sellers/{id} | — | public seller profile |

### Listings

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | /api/listings | Bearer | create listing |
| POST | /api/listings/{id}/photos | Bearer | upload image (multipart, max 5MB, JPEG/PNG/WebP) |
| DELETE | /api/listings/{id}/photos/{photoId} | Bearer | remove photo |
| GET | /api/listings | — | feed: page, per_page, sort, player, team, year, set, price_min, price_max, listing_format, graded, grading_company, grade, auction_ending |
| GET | /api/listings/{id} | — | detail + seller trust + price history |

### Health

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /api/health | — | { status: "healthy" } |

---

## 5. Auth Flow

**Register:** email + name + password → AppUser created (role = buyer, EmailConfirmed = false) → verification token stored → email sent → response: success message or tokens.

**Login:** email + password → Identity password check → access token (JWT, 15 min, HS256) + refresh token (random 256-bit, SHA-256 hashed in DB, 30-day expiry, rotated on every refresh) → both in response body.

**Refresh:** validate refresh token hash exists + not expired + not revoked → revoke old, issue new pair.

**Logout:** revoke refresh token server-side.

**Verify email:** token link (GET /api/auth/verify-email?token=...) or token code (POST).

**Password reset:** POST /api/auth/forgot-password → email with token → POST /api/auth/reset-password with token + new password.

**Google OAuth:** frontend uses Google Identity Services (popup) → ID token credential → POST /api/auth/google with credential → backend verifies via Google.Apis.Auth / tokeninfo → find or create user by email → issue our tokens. Requires `Google:ClientId` in config; graceful "Google login not configured" error if missing.

**Server-enforced rules:**
- Never trust client on user ID, email verification status, or role
- Refresh token rotation prevents token reuse attacks
- Rate limiting on auth endpoints (10/min per IP)

---

## 6. Object Storage

```csharp
public interface IObjectStorage
{
    Task<string> PutAsync(Stream data, string key, string contentType);
    Task DeleteAsync(string key);
    string GetUrl(string key);
}
```

**LocalFileSystemStorage (dev):** writes to `backend/App_Data/uploads/{key}`, served via Kestrel static files at `/uploads/{key}`. Config: `Storage:Provider = Local`.

**S3ObjectStorage (prod):** `AWSSDK.S3`; presigned URLs or public bucket policy. Config: `Storage:Provider = S3`, `Storage:S3:Bucket`, `Storage:S3:Region`, etc.

**Upload validation (server-side):**
- Max 5 MB per image
- MIME type check: JPEG, PNG, WebP only (magic-byte sniff, not extension)
- Filename sanitized; unique key generated (Guid + extension)
- Max 10 photos per listing

**Listing photo flow:**
1. Client uploads via POST /api/listings/{id}/photos (multipart)
2. Server validates MIME + size → stores via IObjectStorage → returns URL
3. Client includes URL in listing creation or update
4. Photos stored in listing_photos table with storage_key + sort_order

---

## 7. Seed Data

On first run when DB empty + Development environment:

- **6 users:** 2 sellers, 3 buyers, 1 both. All email-verified. Passwords hashed by Identity.
- **2 seller profiles:** ratings 4.8 (124 sales) and 4.5 (37 sales).
- **~50 listings:**
  - Players: LeBron James, Michael Jordan, Kobe Bryant, Steph Curry, Luka Dončić, Giannis, Jayson Tatum, Anthony Edwards, Victor Wembanyama, Kevin Durant
  - Teams: Lakers, Bulls, Warriors, Mavericks, Bucks, Celtics, Timberwolves, Spurs, Thunder, Suns
  - Sets: Panini Prizm, Topps Chrome, Select, Optic, Mosaic, Donruss, Hoops
  - Parallels: Silver, Gold, Red, Blue, Black (1/1), Mojo
  - Graded: PSA 10, PSA 9, BGS 9.5 + raw cards
  - Formats: Fixed price + auctions (some ending < 1hr, some < 10min)
  - Statuses: active + sold (to generate price history)
- **~200 price history records** — source = `seed` (clearly separated from `internal_transaction`)
- **Sample reviews** on completed seed orders
- **Each listing:** 2–4 placeholder photo URLs (or uploaded dev images)

---

## 8. Frontend Architecture

**Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, TanStack Query, Zod + React Hook Form, Mapster or manual mapping.

```
src/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (auth)/register/page.tsx
│   ├── (auth)/verify-email/page.tsx
│   ├── (auth)/forgot-password/page.tsx
│   ├── (auth)/reset-password/page.tsx
│   ├── (feed)/page.tsx
│   ├── (feed)/layout.tsx
│   ├── listings/[id]/page.tsx
│   ├── listings/new/page.tsx
│   └── account/page.tsx
├── components/
│   ├── ui/          Button, Input, Card, Badge, Dialog, Skeleton, Select, Separator, Tabs
│   ├── cards/       ListingCard, AuctionCard, CardVisualTreatment
│   ├── listings/    ListingForm, PhotoUpload, ImageGallery, ListingDetail
│   ├── auctions/    Countdown, BidButton
│   ├── sellers/     SellerBadge, SellerTrust, ReviewSummary
│   ├── search/      SearchBar, FilterChip, FilterSheet
│   ├── nav/         BottomNav (mobile), TopNav (desktop)
│   └── charts/      PriceChart
├── features/
│   ├── auth/        useAuth, login/register forms, API hooks
│   ├── listings/    CRUD hooks, feed/detail queries, create form
│   └── search/      filter state, search API hooks
├── lib/
│   ├── api.ts       fetch wrapper, token attach, 401 refresh retry
│   ├── auth.tsx     AuthProvider, useAuth, token storage (memory + httpOnly)
│   ├── format.ts    formatPHP(amount), timeAgo(date), auctionCountdown(endTime)
│   ├── cn.ts        clsx + tailwind-merge utility
│   └── hooks.ts     shared TanStack Query hooks
└── hooks/
    ├── useInfiniteScroll.ts
    └── useMediaQuery.ts
```

---

## 9. UI/UX Design System

### 9.1 Color Tokens

```
SURFACE_BASE       #141517       deep charcoal, page bg
SURFACE_ELEVATED   #1C1D1F       cards, panels
SURFACE_HOVER      #242628       interactive hover
SURFACE_BORDER     #2A2C2E       subtle borders
SURFACE_BORDER_HV  #3A3C3E       hover borders

TEXT_PRIMARY        #F2EFE9       warm white
TEXT_SECONDARY      #8A8D93       muted gray
TEXT_DISABLED       #55585C

ACCENT_GOLD        #C6A24B       champagne gold — CTA, prices, active states
ACCENT_GOLD_DIM    #9A7D3A       hover/pressed gold

STATUS_RED         #E53E3E       auction ending < 10 min
STATUS_AMBER       #E98A1B       auction ending < 1 hr
STATUS_BLUE        #3B82F6       fixed price badge
STATUS_GREEN       #22C55E       delivered / confirmed
```

### 9.2 Typography

| Role | Font | Weight | Notes |
|---|---|---|---|
| Display / prices | DM Serif Display | 700 | Prices visually dominate — 1.5× body size, strong weight |
| Body / UI | DM Sans | 400/500 | Clean sans-serif for all UI text |
| Countdown / data | JetBrains Mono | 500 | Tabular numerals for live timers |

**Price presentation** — the single most important typographic decision:

```
₱12,500                     ← DM Serif Display, bold, ACCENT_GOLD or TEXT_PRIMARY, large
2018 Panini Prizm Silver    ← DM Sans, small, TEXT_SECONDARY
```

### 9.3 Spacing

4px base unit. Scale: 4, 8, 12, 16, 24, 32, 48, 64.

### 9.4 Motion System

| Level | Duration | Use |
|---|---|---|
| Micro | 120–220ms | Hover, focus, button press, tabs |
| Contextual | 250–500ms | Image swap, filter apply, bid success, card→detail transition |
| Showcase | 500–900ms | Page transitions, chart reveal, hero section reveal |

All motion respects `prefers-reduced-motion`. GPU-friendly transforms only (translate, scale, opacity). No continuous JS animation loops unless necessary.

---

## 10. Interactive Card Experience

### 10.1 Card Interaction Hierarchy

Effects are mapped to card metadata via a `CardVisualTreatment` component:

| Tier | Metadata Trigger | Effects |
|---|---|---|
| Standard | Default | Subtle 3D tilt (3–4°), cursor spotlight, small elevation (translateY -4px), image scale 1.02 |
| Silver / Holo | parallel contains "silver" or "holo" | + Holographic foil light sweep, parallax layers |
| Gold / Numbered | parallel contains "gold" or numbered = true | + Stronger foil, premium shadow, deeper perspective |
| Premium | set = Prizm / high-end set | + Full foil + layered depth + parallax |
| Graded | graded = true | + Slab depth, reflective highlight, glass reflection, premium shadow |
| Auction | listing_format = auction | Card interaction + animated countdown + urgency states |

### 10.2 3D Card Tilt

Desktop cards react to pointer movement using CSS perspective, rotateX/Y, translateZ, scale, spring-based transitions. Max rotation: 3–6°. Max scale: 1.01–1.03. Feel: physical and premium, never spin.

### 10.3 Holographic Foil

Cursor-controlled gradient/light sweep overlay simulating holographic foil. Subtle, preserves readability, GPU-friendly (transform + opacity only). Disabled on mobile and `prefers-reduced-motion`.

### 10.4 Card Layers

Structured as: `[card background] → [card frame] → [player image] → [logos/text] → [foil layer] → [lighting layer]`. Parallax offsets per layer relative to cursor. Card image remains source of truth.

### 10.5 Graded Card Treatment

PSA/BGS/SGC: slight 3D tilt + slab depth + reflective highlight + subtle glass/plastic reflection + shadow. Not transparent glass if photo doesn't support it.

### 10.6 Card Reveal Animation

Viewport entry: opacity 0, translateY 20–40px, rotateX 5–10° → opacity 1, translateY 0, rotateX 0°. Staggered for grids. No excessive delay.

### 10.7 Card Flip

Front: card image. Back: card metadata. Used for: featured card, listing preview (creation flow), showcase. NOT the only way to access info.

### 10.8 Card Inspection Mode

Listing detail page: pointer-driven perspective/tilt/parallax/lighting simulating physical inspection. Multiple photos → front/back. Not true 3D.

### 10.9 Card → Listing Transition

Shared-element-style transition from feed card to listing detail primary image. Only if navigation speed isn't compromised. Aspirational for Phase 0–3; defer if it delays nav.

### 10.10 Performance Rules

GPU-friendly only: transform, opacity. Avoid continuous animation of width/height/top/left/box-shadow/filter:blur. Lazy-load below-fold cards. Optimized responsive images.

---

## 11. Core Components

### ListingCard

Most important reusable component. Used in feed grid, search results, seller profile.

```
┌────────────────────────┐
│      [CARD IMAGE]      │   1:1 or 3:4, object-fit cover
├────────────────────────┤
│ Player Name            │   DM Sans 500, TEXT_PRIMARY
│ Year · Set · Parallel  │   DM Sans 400, TEXT_SECONDARY, small
│                        │
│ ₱12,500                │   DM Serif 700, ACCENT_GOLD, large
│ ★ 4.9 · @seller       │   tiny, muted
└────────────────────────┘

Hover (desktop): translateY(-4px), scale(1.02), gold border glow, spotlight follows cursor
Auction variant: adds live countdown (JetBrains Mono) + bid count + urgency border color
```

### AuctionCard

ListingCard variant. Adds: countdown (STATUS_RED < 10min, STATUS_AMBER < 1hr, neutral > 24h), current bid vs buy now, bid count, urgency styling.

### MarketChart

Area chart — champagne gold fill, subtle grid. Hover: tooltip with date + price. Controls: 7D / 30D / 90D / ALL. Summary: total sales, median, last sale. Empty: "Not enough sales data yet".

### SellerTrust

Near purchase CTA. Star rating + sales count + joined date + verification badge. Compact, authoritative.

### FilterChip / FilterSheet

Chips: `Player ×`, `PSA ×`, `₱5k–20k ×`. Desktop: horizontal above grid. Mobile: button → bottom sheet.

### ImageGallery

Desktop: main image + thumbnail strip, click to swap, fullscreen on main. Mobile: swipeable with dots indicator, pinch-to-zoom.

---

## 12. Navigation

**Mobile bottom nav:**
```
🏠 Home   🔍 Search   ➕ Sell   ⏱ Auctions   📦 Orders
```
Account: header avatar → /account.

**Desktop premium header:**
```
[ATLAS]   [🔍 Search player, card, set, year...]   NBA | Auctions | Sell   [Account ▾]
```

---

## 13. Homepage

```
Mobile:                          Desktop:
┌──────────────────┐        ┌──────┬──────────────────────────┐
│ [ATLAS]  [🔍]   │        │Filter│ [🔍 Search player...] │
│                   │        │Sidebar│ NBA | Auctions | Sell   │
│ [NBA][Rookies]... │        │      ├──────────────────────────┤
│                   │        │      │ ENDING SOON              │
│ ── ENDING SOON ── │        │      │[Card][Card][Card][Card] │
│ [Card][Card] ←→  │        │      ├──────────────────────────┤
│                   │        │      │ RECENTLY LISTED          │
│ ── RECENTLY ──────│        │      │[Card][Card][Card][Card]  │
│ [Card][Card]      │        │      │[Card][Card][Card][Card]  │
│ [Card][Card]      │        │      ├──────────────────────────┤
│                   │        │      │ MARKET PULSE             │
│ ── MARKET PULSE ──│        │      │ Player · ▲3.6% · 24 sales│
│ Player · ▲3.6%    │        │      ├──────────────────────────┤
│                   │        │      │ POPULAR PLAYERS          │
│ ── POPULAR ───────│        │      │[LeBron][Jordan][Curry]  │
│ [LeBron][Jordan]  │        └──────┴──────────────────────────┘
└──────────────────┘
```

Hero = search bar + chips (no giant banner — cards are the product).

---

## 14. Listing Detail

```
Mobile:                         Desktop (2-column):
┌──────────────────┐   ┌────────────────────────┬──────────────┐
│  [Image Gallery]  │           │                        │  ₱12,500     │
│  (swipeable)      │           │ [Large Image        │              │
│                   │           │     Gallery]           │  [Buy Now]   │
├──────────────────┤           │                        │  or          │
│ ₱12,500           │           │                        │  [Place Bid] │
│ [Buy/Bid] (sticky)│           ├────────────────────────┤              │
│                   │           │ Card Identity          │  SELLER      │
│ SELLER TRUST      │           │ Player · Year · Set    │  ★ 4.9       │
│ ★ 4.9 · 124 sales│           │ Parallel · Grade       │  124 sales   │
│ [View profile]    │           ├────────────────────────┤  [View →]    │
│                   │           │ ├──────────────┤
│ DETAILS           │           │ MARKET DATA            │              │
│ Description       │           │ [Price Chart]          │ 24 sales     │
│                   │           │ 24 sales · Median ₱10k │ Median ₱10k │
│ MARKET DATA       │           ├────────────────────────┤              │
│ [Chart]           │           │ RECENT SALES           │              │
│                   │           │ ...                    │              │
└──────────────────┘           └────────────────────────┴──────────────┘
```

Sticky Buy/Bid CTA on mobile. Card identity separated from listing.

---

## 15. Listing Creation (progressive disclosure)

```
Step 1: What are you selling?        [Single Card] [Lot] [Hobby Box] [Accessory]
Step 2: Card information             Player, Team, Year, Set, Parallel, Serial#
Step 3: Condition & grading          Condition, Graded?, Company, Grade
Step 4: Photos                       Upload, reorder, preview, max 10
Step 5: Selling format               Fixed price ₱ / Auction (start price + end time)
Step 6: Preview                      Live listing card (desktop: side-by-side; mobile: overlay)
```

Desktop: form left, live preview right. Mobile: step-by-step with progress indicator.

---

## 16. Testing

### Unit (Atlas.Tests.Unit)
- Listing validation (required fields, price ≥ 0)
- Bid validation (auction active, bid > current + increment, bidder ≠ seller)
- Auction state transitions
- Order state machine
- Review eligibility
- CardIdentityKey generation + price aggregation

### Integration (Atlas.Tests.Integration)
- EF Core against real PostgreSQL (test DB)
- Register → verify → login → create listing → upload photo → feed → detail
- Refresh token rotation, revocation

### API (Atlas.Tests.Api)
- WebApplicationFactory
- Auth endpoints: status codes, validation errors, rate limiting
- Listing CRUD: ownership checks, authorization
- Feed: pagination, filtering, sorting correctness
- Upload: MIME validation, size limits

### Frontend (Vitest)
- PHP currency formatter (₱)
- Auction countdown formatting
- Listing form validation logic

---

## 17. Observability & Error Handling

- Serilog structured JSON logging (console)
- Request correlation ID middleware (X-Request-Id)
- Auth failure logging (attempted email + IP, never passwords)
- Listing created/uploaded events
- Rate limit hit events
- Never log: passwords, tokens, sensitive payment info

**Error handling:** global exception handler → RFC 7807 ProblemDetails. Frontend: toast notifications + inline field errors. Loading / success / empty / error / retry states on every major action.

---

## 18. Acceptance Criteria (Phase 0–3)

At the end of Phase 0–3, this end-to-end flow must work:

```
Register → Verify email → Login
  → Create seller profile
  → Create NBA card listing (with photos)
  → Listing appears in marketplace feed
  → Another user searches/filters
  → Buyer opens listing detail
  → Buyer sees seller trust + card metadata
  → Listing detail shows price history (seed data)
```

---

## 19. Future Phases (out of scope, for reference only)

Phase 4: Search + Listing Details (full)
Phase 5: Auctions (bidding, lifecycle, concurrency)
Phase 6: Orders (fulfillment, tracking, receipt)
Phase 7: Payments (PSP selection — PayMongo vs Xendit)
Phase 8: Messaging + Reviews
Phase 9: Production Hardening
