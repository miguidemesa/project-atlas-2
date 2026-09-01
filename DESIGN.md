> **Amendment (2026-08-24):** Scope now spans NBA, Pokémon, One Piece and Disney
> (Lorcana) categories. Surface theme flipped dark-first → light-first: warm paper
> base (#F6F4EF), white elevated cards, ink text; champagne gold deepened one step
> (#C6A24B → #B08D3E) to hold AA contrast on light surfaces. Card artwork stays
> rich/dark so the physical-card identity is unchanged.
>
> **Typography amendment (2026-08-24):** DM Serif Display / DM Sans retired as
> model-default tells. New voice: **Bricolage Grotesque** (display + body —
> characterful ink-trap grotesque, prices remain the loudest type on any
> screen) with **JetBrains Mono** retained for countdowns and market data.
>
> **Motion additions (2026-08-24):** three authored moments only — (1) hero
> parallax card stack at per-layer depths with idle float, (2) scroll-scrubbed
> "grail showcase" where the card settles to true while trust steps crossfade,
> (3) IntersectionObserver reveals with sibling stagger. All transform/opacity
> GPU-only, all disabled under prefers-reduced-motion.

# NBA Card Marketplace — Design System

> A premium digital card exchange for Philippine collectors.
> Dark-first. Card-as-hero. The card feels physical.

---

## Visual Identity

**Not:** generic ecommerce, eBay clone, Whatnot clone, NFT marketplace, cyberpunk, AI slop.
**Yes:** eBay trust + TCGplayer price transparency + Whatnot urgency + 21st.dev interaction patterns + premium sports-card culture.

**Signature:** The card feels physical — depth, perspective, light, foil, physicality. This is the product's brand identity.

---

## Color System

### Surfaces

| Token | Hex | Use |
|---|---|---|
| SURFACE_BASE | `#141517` | Page background |
| SURFACE_ELEVATED | `#1C1D1F` | Cards, panels, modals |
| SURFACE_HOVER | `#242628` | Interactive hover states |
| SURFACE_BORDER | `#2A2C2E` | Default borders |
| SURFACE_BORDER_HV | `#3A3C3E` | Hover borders |

### Text

| Token | Hex | Use |
|---|---|---|
| TEXT_PRIMARY | `#F2EFE9` | Warm white — headings, primary content |
| TEXT_SECONDARY | `#8A8D93` | Muted gray — labels, metadata |
| TEXT_DISABLED | `#55585C` | Placeholder, disabled states |

### Accent

| Token | Hex | Use |
|---|---|---|
| ACCENT_GOLD | `#C6A24B` | Champagne gold — CTA accents, prices, active states, logo |
| ACCENT_GOLD_DIM | `#9A7D3A` | Hover/pressed gold |

### Status

| Token | Hex | Use |
|---|---|---|
| STATUS_RED | `#E53E3E` | Auction ending < 10 min |
| STATUS_AMBER | `#E98A1B` | Auction ending < 1 hr |
| STATUS_BLUE | `#3B82F6` | Fixed price badge |
| STATUS_GREEN | `#22C55E` | Delivered / confirmed / verified |

**Rules:** Prices use ACCENT_GOLD or TEXT_PRIMARY — never status colors. Status colors are reserved for urgency/state only. Do not overuse colors. One primary accent (gold).

---

## Typography

| Role | Font | Weight | Notes |
|---|---|---|---|
| Display headings | DM Serif Display | 700 | Page titles, section headers — characterful serif |
| **Prices** | **DM Serif Display** | **700** | **Visually dominant — 1.5× body size. Strong weight. ACCENT_GOLD or TEXT_PRIMARY.** |
| Body / UI | DM Sans | 400/500 | Clean sans-serif — all body copy, labels, forms |
| Countdown / data | JetBrains Mono | 500 | Tabular numerals for live timers, chart data |

### Price Presentation

The single most important typographic decision — prices must visually dominate their cards:

```
₱12,500                     ← DM Serif Display, bold, ACCENT_GOLD, large
2018 Panini Prizm Silver    ← DM Sans, small, TEXT_SECONDARY
```

Formatting: `₱12,500` (Philippine peso, comma-separated thousands, no decimals for whole pesos). PHP currency always.

---

## Spacing

4px base unit. Scale: `4, 8, 12, 16, 24, 32, 48, 64`. Consistent across all components.

---

## Motion System

Three tiers:

| Level | Duration | Use |
|---|---|---|
| Micro | 120–220ms | Hover, focus, button press, tabs, dropdowns, card lift |
| Contextual | 250–500ms | Image swap, filter apply, bid success, card→detail transition, listing opened |
| Showcase | 500–900ms | Page transitions, chart reveal, hero section, card image expansion |

**Rules:**
- Motion communicates hierarchy, state, feedback, spatial relationship
- Never animate simply because animation is possible
- Respect `prefers-reduced-motion`: remove tilt, parallax, decorative transitions; keep functional feedback only
- GPU-friendly transforms only: translate, scale, opacity
- Avoid continuous animation of: width, height, top, left, box-shadow, filter: blur()
- No unnecessary requestAnimationFrame loops
- Lazy-load below-fold cards

---

## Interactive Card Experience

The trading card is the primary interactive object. Do not treat card images as static ecommerce product images.

### Card Interaction Hierarchy

Effects map to card metadata via `CardVisualTreatment` component:

| Tier | Trigger | Effects |
|---|---|---|
| Standard | Default | Subtle 3D tilt (3–4°), cursor spotlight, small elevation (translateY -4px), image scale 1.02 |
| Silver / Holo | parallel contains "silver" or "holo" | + Holographic foil light sweep, parallax layers |
| Gold / Numbered | parallel = "gold" or numbered = true | + Stronger foil, premium shadow, deeper perspective |
| Premium | set = Prizm / high-end | + Full foil + layered depth + parallax |
| Graded | graded = true | + Slab depth, reflective highlight, glass reflection, premium shadow |
| Auction | listing_format = auction | Card interaction + animated countdown + urgency states |

### 3D Card Tilt

Desktop cards react to pointer movement. CSS perspective + rotateX/Y + translateZ + scale + spring-based transitions. Max rotation: 3–6°. Max scale: 1.01–1.03. Never spin aggressively.

### Holographic Foil

Cursor-controlled gradient/light sweep overlay simulating holographic foil (Prizm-style, metallic stock). Subtle, preserves readability, GPU-only. Disabled on mobile and `prefers-reduced-motion`.

### Card Layers

```
[card background] → [card frame] → [player image] → [logos/text] → [foil layer] → [lighting layer]
```

Parallax offsets per layer relative to cursor. Card image remains source of truth — never invent player/card information.

### Graded Card Treatment

PSA/BGS/SGC cards: 3D tilt + slab depth + reflective highlight + subtle glass/plastic reflection + premium shadow. Not transparent glass if photo doesn't support it.

### Card Reveal Animation

Viewport entry: opacity 0 → 1, translateY 20–40px → 0, rotateX 5–10° → 0. Staggered for grids. No excessive delay — users should browse immediately.

### Card Flip

Front: card image. Back: card metadata. Used for: featured card, listing preview (creation flow), showcase. NOT the only way to access information.

### Card Inspection Mode

Listing detail: pointer-driven perspective/tilt/parallax/lighting simulating physical inspection. Multiple photos → front/back. Not true 3D reconstruction.

### Card → Listing Transition

Shared-element-style expansion from feed card to listing detail primary image. Only if navigation speed isn't compromised. Aspirational — defer if it delays nav.

---

## Core Components

### ListingCard

Most important reusable component. Used in feed, search, seller profile.

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
```

### AuctionCard

ListingCard variant. Adds: live countdown (JetBrains Mono, red/amber/neutral), current bid, bid count, urgency border color, countdown animation.

### MarketChart

Area chart — champagne gold fill, subtle grid. Hover: tooltip (date + price). Controls: 7D / 30D / 90D / ALL (only show ranges with data). Summary: total sales, median price, last sale. Empty: "Not enough sales data yet" — never fabricate market data.

### SellerTrust

Near purchase CTA. Star rating + sales count + joined date + verification badge. Compact, authoritative. Sits between price and CTA (desktop); above description (mobile).

### FilterChip / FilterSheet

Chips: `Player ×`, `PSA ×`, `₱5k–20k ×` — rounded, removable. Desktop: horizontal above grid. Mobile: "[Filters 3] [Sort]" button → bottom sheet.

### ImageGallery

Desktop: main image + thumbnail strip, click to swap, fullscreen on main click. Mobile: swipeable with dots, pinch-to-zoom, smooth transitions.

---

## Navigation

### Mobile Bottom Nav

```
🏠 Home   🔍 Search   ➕ Sell   ⏱ Auctions   📦 Orders
```
Sell button: raised gold circle (+). Account: header avatar → /account.

### Desktop Premium Header

```
[ATLAS]   [🔍 Search player, card, set, year...]   NBA | Auctions | Sell   [Account ▾]
```
Search is primary navigation element — full-width bar, centered.

---

## Screens

### Homepage (Feed)

```
Hero: search bar + category chips (NBA, Rookies, Graded, Auctions, New)
  — no giant marketing banner; cards are the product

Ending Soon:    horizontal scroll (mobile) / row (desktop), auction cards with urgency
Recently Listed: grid (2-col mobile, 4-5-col desktop)
Market Pulse:    trend cards (player + price change + volume) — seed data in Phase 0–3
Popular Players: clickable pills for quick-filter
```

Desktop: sidebar filters (player, team, year, set, price, type, grade).
Mobile: filter button → bottom sheet.

### Listing Detail

Mobile: image gallery → price → Buy/Bid (sticky) → seller trust → details → market data → description
Desktop: 2-column — large gallery left; price + CTA + seller trust + market data right

### Listing Creation

Progressive disclosure (6 steps): What → Card info → Condition → Photos → Format → Preview.
Desktop: form left, live preview right. Mobile: step-by-step with progress.

### Auth Screens

Register, login, verify email, forgot password, reset password, Google OAuth button.
Dark themed, centered card layout, champagne gold accents.

---

## Design Principles

Prioritize in order:

```
Clarity
↓
Trust
↓
Speed
↓
Discoverability
↓
Delight
```

Not: Animation → Visual effects → Novelty → Everything else.

### Visual Hierarchy

Every screen must answer:
1. What am I looking at?
2. How much does it cost?
3. Who is selling it?
4. Can I trust them?
5. What makes this card special?
6. What should I do next?

### Anti-Slop Rules

Do NOT produce:
- Generic gradient heroes
- Excessive glassmorphism
- Random floating blobs
- Excessive rounded cards
- Giant glowing buttons
- Purple-blue SaaS aesthetic
- Excessive neon
- Huge headings everywhere
- Unnecessary animations
- Excessive shadows
- Meaningless decorative icons
- Generic dashboard layout

The design should look deliberately art-directed.

---

## Performance

Performance > visual effects. Prioritize:
- Image optimization + lazy loading
- Responsive image sizes
- Skeleton loading states
- Minimal client-side JavaScript
- GPU-friendly transforms only
- No expensive continuous animation
- No WebGL, no canvas effects, no huge background videos
