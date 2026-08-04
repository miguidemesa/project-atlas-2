# API — Endpoint Reference (Phase 0–3)

Base URL: `http://localhost:5000` (see `NEXT_PUBLIC_API_URL`).

All endpoints return JSON. Errors use [RFC 7807](https://www.rfc-editor.org/rfc/rfc7807) `ProblemDetails`.

The authoritative API design lives in the design spec at [`docs/superpowers/specs/2026-08-04-nba-card-marketplace-phase0-3-design.md`](docs/superpowers/specs/2026-08-04-nba-card-marketplace-phase0-3-design.md).

## Auth

All `/api/auth/*` endpoints are rate-limited to **10 requests/min per IP**.

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | — | email + name + password |
| POST | `/api/auth/login` | — | email + password → access + refresh tokens |
| POST | `/api/auth/refresh` | — | rotate refresh token |
| POST | `/api/auth/logout` | Bearer | revoke refresh token |
| POST | `/api/auth/verify-email` | — | token (from email) |
| POST | `/api/auth/resend-verification` | — | resend verification email |
| POST | `/api/auth/forgot-password` | — | email → reset token |
| POST | `/api/auth/reset-password` | — | token + new password |
| POST | `/api/auth/google` | — | Google ID token → our tokens; 503 if not configured |

## Users

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/auth/me` | Bearer | current user profile |
| PATCH | `/api/users/me` | Bearer | update name/phone |

## Sellers

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/sellers` | Bearer | become a seller (creates `SellerProfile`) |
| GET | `/api/sellers/{id}` | — | public seller profile |

## Listings

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/listings` | Bearer | create listing |
| POST | `/api/listings/{id}/photos` | Bearer | upload image (multipart, max 5MB, JPEG/PNG/WebP) |
| DELETE | `/api/listings/{id}/photos/{photoId}` | Bearer | remove photo |
| GET | `/api/listings` | — | feed — see query parameters below |
| GET | `/api/listings/{id}` | — | detail + seller trust + price history |

### Feed query parameters (`GET /api/listings`)

`page`, `per_page`, `sort`, `player`, `team`, `year`, `set`, `price_min`, `price_max`, `listing_format`, `graded`, `grading_company`, `grade`, `auction_ending`.

### Upload rules

- Max 5 MB per image
- MIME type check: JPEG, PNG, WebP only (magic-byte sniff, not extension)
- Max 10 photos per listing

## Health

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/health` | — | `{ "status": "healthy" }` |

## Server-Enforced Rules

- Never trust the client for user ID, email verification status, or role.
- Refresh token rotation prevents token reuse attacks.
- All critical business decisions happen server-side (see `CLAUDE.md` domain rules).
