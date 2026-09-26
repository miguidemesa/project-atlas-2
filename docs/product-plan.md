# Atlas Product Plan

**This repo (`project-atlas-2`, Clean Architecture backend in `backend/`, Next.js frontend in
`frontend/`) is the canonical repo going forward.** A parallel effort happened in a separate
repo (`atlas-ph`) while this repo was untouched; that repo has its own independent rewrite of
both backend and frontend and will not be merged in as code — its design decisions, bug
reports and mockups are being ported here by hand instead. Once porting is done, `atlas-ph`
should be archived or deleted so there is only one live repo.

Mockups: [Atlas Home and Pokémon Mockups](https://claude.ai/artifact/LDFpnk9mGsRceE78gSckoR)
(private canvas — 4 artboards: `Main` (home, desktop), `HomePhone`, `PokemonDesktop`,
`PokemonPhone`). Design rules: [DESIGN.md](../DESIGN.md).

## Principles (from the mockups)

1. **The card is the product.** Card photos sit in the same neutral well everywhere. No
   per-game theming, framing or coloured slab label on the card itself.
2. **Themes belong to pages, not cards.** Home is neutral. Choosing a game (Pokémon, One
   Piece, NBA, Magic, Yu-Gi-Oh!, Funko) opens that game's hub, themed with the game's colour,
   pattern and accent. Global header, footer and phone tab bar stay neutral.
3. **One action colour.** Emerald (`#34d399`) means buy, sell or search everywhere, themed or
   not.
4. **Condition/grade chips keep their meaning-carrying colours** (NM green, LP blue, MP
   orange, graded gold) — the one exception to "no colour on the card."
5. **Real data only.** No invented counts, trends or reviews. A section without data is
   hidden, not faked.
6. **Philippine-first.** Peso prices, PH time, GCash/Maya, courier or meetup.

## Already true in this codebase (don't rebuild)

The Clean Architecture backend already has domains the atlas-ph rewrite had to build from
scratch: `Auctions`, `Disputes`, `Wallet`, `Rewards`, `Offers`, `Orders`, `Pricing`,
`MarketData`/PriceCharting, `Payouts`, an admin/ops surface, and Serilog + notifications
infra. Porting work here is mostly **UI redesign + wiring fixes**, not new domain logic.

## Phase 1 — Plain cards and themed game hubs

| Step | What | Where |
|---|---|---|
| 1.1 | Plain listing tile: neutral well, name + condition/grade chip, set/number, price, seller, city. Remove tilt effect and per-listing themed badges. | `frontend/src/components/cards/listing-card.tsx` |
| 1.2 | Dark theme + Archivo font token migration (bg `#0b0b0d`, cards `#151518`, emerald `#34d399` accent, condition chip palette). | `frontend/src/app/globals.css`, `layout.tsx` |
| 1.3 | Page-level game skins (tokens per game: ground/surface/accent/pattern), used only by hub pages + home category tiles. | `frontend/src/app/skins.css` (new), `lib/categories.ts` |
| 1.4 | Storefront API: category filter, trending (30-day views), under-market listings, recent sales range + 30-day price series. | `backend/src/Atlas.Application/Listings`, `MarketData` |
| 1.5 | Home redesign: hero search, 6 category doors, featured carousel, tabbed list (New & trending / Top sellers / Ending soon / Deals) with preview panel, events, price moves, recently sold, just-listed grid, sell band. | `frontend/src/app/page.tsx` |
| 1.6 | Game hub route `/[game]` (e.g. `/pokemon`): themed band, scoped search, featured, tabbed list, sets, hub events, latest listings with language filter. | `frontend/src/app/[game]/page.tsx` (new) |
| 1.7 | Nav: header (Marketplace, Categories, Price guide, Events, Sell) + phone bottom tab bar (Home, Search, Sell, Inbox, Me). | `frontend/src/components/layout/*` |
| 1.8 | Rewrite `DESIGN.md` for plain cards + page themes. | `DESIGN.md` |

## Phase 2 — Fix wiring/bugs (parity issues found in the atlas-ph audit; verify each against this codebase, don't assume it's broken here too)

| Step | What |
|---|---|
| 2.1 | Multi-seller checkout: one order + payment per seller, not just the first item. |
| 2.2 | Auction creation end-to-end (starting bid, reserve, end date), auto-bid to a max, last-second extension. |
| 2.3 | Real photo uploads in create-listing (replace any mocked/simulated upload path). |
| 2.4 | Endpoint parity: collections, offer cards in chat, checkout address step, counter-offer acceptance. |
| 2.5 | Admin screen for seller KYC review (pre-signed image links, approve/reject, audit log) — currently nobody can become a verified seller. |
| 2.6 | Email delivery for verification + password reset; in-app notifications. |
| 2.7 | Search: language filter (English/Japanese), set filter, graded-only filter; server-rendered listing pages so link previews work. |
| 2.8 | Rate limiting: keep login lockout, but exclude token refresh from the per-minute limit and set the limit high enough that carrier-grade NAT (shared IPs behind PH mobile carriers) doesn't lock out unrelated users. |

## Phase 3 — New posting flow with scan assist

1. Front + back photos required; optional close-ups (corners, label, surface).
2. Scan assist: seller photographs the card, Atlas suggests name/set/number/language + a price
   range from recent sales; seller confirms every field (nothing auto-publishes).
   - Fast match first: read card number/set code from the photo, look it up; pgvector
     image-similarity as a fallback for glare/sleeves.
   - AI only as backup when fast match is unsure (model choice — Opus for accuracy on
     Japanese text vs. Sonnet/Haiku for cost — decide after testing on ~200 real photos).
3. Condition guide with photo examples; graded cards ask for a cert number, checked
   automatically where the grading company allows it.
4. Price suggestion order: Atlas's own recent sales (same card/condition/grade) → current
   asking prices → outside prices (TCGplayer, Cardmarket, JP shops) converted to pesos and
   labelled with source, where terms allow.

## Phase 4 — Catalog import, then scanning

Atlas's catalog is effectively empty today. Import free/open sources where terms allow
(English Pokémon, Magic, Yu-Gi-Oh!); One Piece and Japanese Pokémon and sports cards have no
open source — check terms before storing images. Catalog completeness gates how good scan
assist (Phase 3) and set pages / top-sellers (below) can be.

- Record a `CardPricePoint` per completed order linked to a catalog card (real sales history).
- Set pages: listing counts + "from" price per `CardSet`.
- Top sellers by 30-day sales count, once enough order volume exists.

## Phase 5 — Unique features (suggested order below)

1. **Hanap board** (buy orders): buyers post "LF Charizard ex 151 SIR NM, up to ₱40,000";
   sellers see "3 buyers want this" when they list or scan a match.
2. **Meetup escrow**: pay in-app, meet up, buyer scans seller's QR to release funds.
3. **Proof photos**: in-app camera stamps a one-time code + username; flag photos copied from
   other listings.
4. **Bring-to-event listings**: sellers tag cards for a pop-up; buyers reserve + pick up.
5. **Binder view**: seller shops/collections as flippable 9-pocket binder pages.
6. **Peso price index**: PH vs. Japan/US price comparison per card.
7. **Group grading submissions**: join a batch PSA/CGC run, track it, auto-list on return.
8. **Condition accuracy score** on seller profiles, confirmed by buyers on delivery.

Also from the plan: sellers follows/posts/ratings-with-reviews (Phase 5b), card shops map
(Phase 6, gated on the KYC approval screen from Phase 2.5 — only verified sellers pin a shop,
business address only, OpenStreetMap/Leaflet to avoid Google Maps cost).

## Phase 6 — Mobile app

**Decision: React Native (Expo)**, not Flutter — shares category/types/API-client/design-token
code with the Next.js frontend; Expo covers everything needed (camera for scanning, push
notifications, `react-native-maps`, the SignalR client for live bids, OTA updates). Flutter's
rendering control isn't worth losing that shared code.

Backend prerequisite: the API currently expects the refresh token via browser cookie only.
The app needs its own secure refresh path (token in the phone's secure storage) before mobile
work starts.

## Ops / security checklist (carry over regardless of phase)

- [ ] Confirmed clean: this repo's `appsettings*.json` only has local dev placeholders
      (`postgres`/`postgres`, a key marked `dev-only`) — nothing to rotate here.
- [ ] `atlas-ph`'s live Supabase DB password + JWT signing key were committed to its git
      history — rotate those independently of this repo, and never bring that history over.
- [ ] Once this repo owns production, archive/delete `atlas-ph` so there's a single source of
      truth.

## Progress log

| Date | Step | Commit summary |
|---|---|---|
| 2026-09-26 | Plan | Added this plan; established project-atlas-2 as the sole canonical repo. |
