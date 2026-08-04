# NBA Card Marketplace Philippines

Production-quality MVP for a Philippine online marketplace focused on NBA/basketball trading cards. Dark-first premium UI. Mobile-first responsive design.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| State | TanStack Query (React Query) |
| Forms | React Hook Form + Zod |
| Backend | ASP.NET Core 10 Web API, C#, .NET 10 |
| ORM | Entity Framework Core 10 + Npgsql |
| Database | PostgreSQL 14 |
| Auth | ASP.NET Core Identity + JWT (access 15m + refresh 30d rotating) |
| Object Storage | `IObjectStorage` — local filesystem (dev), S3-compatible (prod) |
| Logging | Serilog (structured JSON, correlation IDs) |
| Testing | xUnit, FluentAssertions, WebApplicationFactory (backend); Vitest (frontend) |
| Validation | FluentValidation (server), Zod (client) |

## Architecture

Modular monolith with clean layered boundaries:

```
backend/
  src/Atlas.Domain/          ← pure entities, enums, value objects, domain exceptions
  src/Atlas.Application/     ← service interfaces + implementations, DTOs, FluentValidation, Mapster
  src/Atlas.Infrastructure/  ← EF Core DbContext, migrations, Identity, storage, email, JWT
  src/Atlas.Web.Api/         ← controllers, middleware, DI wiring, Program.cs
  tests/Atlas.Tests.Unit/
  tests/Atlas.Tests.Integration/
  tests/Atlas.Tests.Api/

frontend/
  src/app/                   ← Next.js App Router pages
  src/components/            ← reusable UI components (ui/, cards/, listings/, etc.)
  src/features/              ← feature-specific hooks and components
  src/lib/                   ← api client, auth context, formatters, utilities
```

## Running the Project

### Prerequisites
- .NET 10 SDK
- Node.js 24+ / npm
- PostgreSQL 14+ (running locally or via docker-compose)

### Backend
```bash
cd backend
dotnet restore
dotnet build
# Run API (from src/Atlas.Web.Api):
cd src/Atlas.Web.Api
dotnet run          # runs on http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev         # runs on http://localhost:3000
```

### Database
```bash
cd backend/src/Atlas.Web.Api
dotnet ef database update    # apply migrations
# Seed data runs automatically on first launch when DB is empty + Development env
```

### Tests
```bash
# Backend
cd backend
dotnet test

# Frontend
cd frontend
npm test
```

## Coding Conventions

### C#
- File-scoped namespaces
- Nullable reference types enabled
- PascalCase for types, properties, methods
- camelCase for local variables, parameters
- Records for DTOs, classes for entities
- Async/await for all I/O
- No public fields — properties only
- Use `Guid` for primary keys

### TypeScript / React
- Strict TypeScript mode
- Named exports (no default exports for components)
- Functional components only
- Custom hooks in `src/hooks/` or colocated with feature
- Server components by default; `'use client'` only when needed (forms, interactive)
- Tailwind classes (no inline styles in production code — inline in mockups only)

### File Naming
- C#: `PascalCase.cs` — one type per file
- TypeScript: `PascalCase.tsx` for components, `camelCase.ts` for utilities
- Pages: `page.tsx` (Next.js convention)
- Tests: `*.Tests.Unit`, `*.Tests.Integration`, `*.Tests.Api` projects; `*Tests.cs` files

### Database
- Snake_case table and column names
- Plural table names
- EF Core migrations for all schema changes
- Never modify production schema without a migration
- Foreign keys named: `fk_{table}_{referenced}`

## Domain Rules (invariants)

These rules are enforced server-side and must never be overridden by the client:

1. **A seller cannot bid on their own listing**
2. **A buyer cannot purchase their own listing**
3. **Expired auctions cannot accept bids**
4. **Bids must be validated atomically** (DB transactions, row-level locking)
5. **Only verified PSP events can transition payment state** (not implemented in Phase 0–3)
6. **Users can only review eligible transactions**
7. **User cannot review themselves**
8. **Ratings are computed server-side only** — never trust client values
9. **Money is `decimal(18,2)` PHP** — never use floating-point for financial values
10. **Seed data is marked with `source = 'seed'`** — never mixed with real transaction data
11. **All critical business decisions happen server-side** — client is never trusted for: user ID, payment status, auction status, order status, listing ownership

## Scope

### In Scope (Phase 0–3)
- User registration / login / email verification / password reset / Google OAuth
- Seller profiles / onboarding
- NBA card listings (single card, lot, hobby box, accessory)
- Fixed-price and auction listings
- Image upload with validation
- Home/browse feed with filters and pagination
- Listing detail pages
- Search (server-side structured search)
- Seed data (realistic NBA card mock data)
- Unit, integration, and API tests

### Explicitly Out of Scope (all phases)
- Payment integration (Phase 7 — PSP selection pending)
- Order lifecycle (Phase 6)
- Bidding / auction lifecycle (Phase 5)
- Messaging (Phase 8)
- Reviews (Phase 8)
- Wishlist / Favorites / Follow-seller
- Live streaming / live auctions
- Card authentication / grading
- Shipping API integrations (manual tracking only)
- Offer/negotiation workflows
- Custom escrow / internal wallets
- Non-NBA categories (Pokemon, NFL, MLB, etc.)
- Category switching UI

## Environment Variables

See `.env.example` for full list. Key variables:

```
# Backend
ConnectionStrings__DefaultConnection=Host=localhost;Database=atlas_marketplace;Username=postgres;Password=...
Jwt__SecretKey=your-256-bit-secret
Jwt__AccessTokenExpiryMinutes=15
Jwt__RefreshTokenExpiryDays=30
Google__ClientId=          # optional — Google login disabled if empty
Storage__Provider=Local    # Local | S3
Storage__Local__Path=App_Data/uploads
# Storage__S3__Bucket, Storage__S3__Region, etc. for production

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Important Notes

- **Docker daemon may not be running** — use local PostgreSQL (running at `/tmp:5432`) for development
- **Visual mockups** exist in `.superpowers/brainstorm/` — reference for UI design
- **ECC rules** installed in `~/.claude/rules/ecc/` — agent guidelines for coding style, security, testing
- **Design spec** at `docs/superpowers/specs/2026-08-04-nba-card-marketplace-phase0-3-design.md`
- The accent color is **champagne gold (#C6A24B)** — never finalize brand color without checking this
