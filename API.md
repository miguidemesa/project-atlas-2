# API — Endpoint Reference

Base URL: `http://localhost:5080` in local development (see `NEXT_PUBLIC_API_URL`).

All endpoints return JSON. Errors use [RFC 7807](https://www.rfc-editor.org/rfc/rfc7807) `ProblemDetails`.

Bids, orders, payments, reviews, conversations, offers, disputes and rewards endpoints also exist; read the controllers in `backend/src/Atlas.Web.Api/Controllers/` for those.

## Auth

All `/api/auth/*` endpoints are rate-limited to **10 requests/min per IP**.

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | — | email + name + password |
| POST | `/api/auth/login` | — | email + password → access + refresh tokens |
| POST | `/api/auth/refresh` | — | rotate refresh token |
| GET | `/api/auth/me` | Bearer | current user profile |

Not built yet: logout, email verification, password reset, Google sign-in (not yet assigned to a plan).

## Categories

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/categories` | — | every game and sport: slug, name, group, hue, live listing count |

## Storefront

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/storefront` | — | home shelves: spotlight, trending, grails, ending soon, new arrivals, recently sold, per-category counts (cached 60s) |
| GET | `/api/storefront?category=pokemon` | — | one game's hub, plus its sets; unknown slug is 400 |

## Listings

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/listings` | — | live listings: `category, format (fixed\|auction), type, graded, minPrice, maxPrice, language, player, q, sort (newest\|popular\|price_asc\|price_desc\|ending), page, pageSize` (max 60) |
| GET | `/api/listings/{id}` | — | detail with photos, seller and price history |
| GET | `/api/listings/mine` | Bearer | the caller's listings |
| POST | `/api/listings` | Bearer | create (category must be a slug from `/api/categories`) |
| POST | `/api/listings/{id}/photos` | Bearer | upload photo |
| POST | `/api/listings/{id}/sold` | Bearer | seller marks sold |
| GET | `/api/listings/competing` | Bearer | other sellers' prices for the same card |

## Sellers

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/sellers/{id}` | — | real stats and the seller's live listings (up to 60) |
| GET | `/api/sellers/{id}/reviews` | — | reviews for the seller |

### Upload rules

- Max 5 MB per image
- MIME type check: JPEG, PNG, WebP only (magic-byte sniff, not extension)
- Max 6 photos per listing

## Health

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/health` | — | `{ "status": "healthy" }` |

## Server-Enforced Rules

- Never trust the client for user ID, email verification status, or role.
- Refresh token rotation prevents token reuse attacks.
- All critical business decisions happen server-side (see `CLAUDE.md` domain rules).
