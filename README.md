# Atlas — Trading Card Marketplace Philippines

A Philippine marketplace for every trading card game and sport — Pokémon, Magic, Yu-Gi-Oh!, One Piece, Lorcana, basketball and more — priced in pesos.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | ASP.NET Core Web API (.NET 10), C# |
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Database | PostgreSQL |
| ORM | Entity Framework Core + Npgsql |
| Auth | ASP.NET Core Identity + JWT (access/refresh tokens) |
| Object Storage | `IObjectStorage` — local filesystem (dev), S3-compatible (prod) |
| Testing | xUnit (backend), Vitest (frontend) |

## Project Structure

```
backend/            ASP.NET Core modular monolith (Domain / Application / Infrastructure / Web.Api)
frontend/           Next.js App Router application
docker-compose.yml  Local PostgreSQL for development
```

## Prerequisites

- .NET 10 SDK
- Node.js 24+ / npm
- PostgreSQL 14+ (local or via docker-compose)

## Local credentials

Supply the required backend credentials through environment variables. For a new
local PostgreSQL database, generate values in the shell used to run Docker
Compose, the backend and migrations:

```bash
export POSTGRES_PASSWORD="$(openssl rand -hex 24)"
export ConnectionStrings__DefaultConnection="Host=localhost;Port=5432;Database=atlas_marketplace;Username=postgres;Password=$POSTGRES_PASSWORD"
export Jwt__SecretKey="$(openssl rand -hex 32)"
```

For an existing database, use its current credentials. Changing an environment
variable does not update the password in an existing Docker database volume.

## Run the backend

```bash
cd backend
dotnet restore
dotnet build
cd src/Atlas.Web.Api
dotnet run --urls http://localhost:5080   # macOS AirPlay already uses port 5000
```

## Run the frontend

```bash
cd frontend
npm install
npm run dev           # http://localhost:3000
```

The UI follows `DESIGN.md` (Holo Night: night navy, holo cyan as the only action colour, Unbounded + Onest + JetBrains Mono). Components come from shadcn/ui (Radix), restyled to those tokens; add more with `npx shadcn@latest add <name>`, and use `bg-muted` for row highlights because Atlas's `accent` is the cyan.

## Apply database migrations

```bash
cd backend/src/Atlas.Web.Api
dotnet ef database update
# Seed data runs automatically on first launch when DB is empty + Development env
```

## Environment Configuration

Supply configuration through exported environment variables or your deployment
platform's secret store. ASP.NET Core maps double underscores to configuration
sections. It does not automatically load a local `.env` file; Docker Compose
loads one from the repository root for its own configuration.

| Variable | Purpose |
|---|---|
| `ConnectionStrings__DefaultConnection` | Required PostgreSQL connection string for the backend and EF migrations |
| `Jwt__SecretKey` | Required JWT signing secret with at least 32 bytes; generate a separate value for each environment |
| `POSTGRES_PASSWORD` | Required when starting PostgreSQL with Docker Compose |
| `NEXT_PUBLIC_API_URL` | Frontend API URL; omit to use sample listing data |
| `OpenAI__ApiKey` | Optional server-side key for vision and natural-language search |
| `Notifications__Resend__ApiKey` | Optional server-side email provider key |
| `MarketData__PriceCharting__ApiKey` | Optional server-side pricing provider key |
| `MarketData__Provider` | Set to `PriceCharting` to enable the pricing provider; defaults to `None` |
| `Payments__PayMongo__SecretKey` | Required when using the PayMongo payment provider |
| `Payments__Provider` | Set to `PayMongo` to enable the payment gateway; defaults to `Mock`, which simulates successful payments |

Environment files, private keys and local secret files are ignored by Git and
excluded from Docker build contexts. Keep API keys on the backend: variables
prefixed with `NEXT_PUBLIC_` are exposed to browser code. Replace any credentials
that have previously been committed; deleting a file does not remove old commits.

## Tests

```bash
# Backend: API tests need a disposable Postgres; ATLAS_TEST_DB must name a database containing "test"
export ATLAS_TEST_DB="Host=127.0.0.1;Port=5499;Database=atlas_test;Username=postgres"
cd backend && dotnet test

# Frontend
cd frontend && npx tsc --noEmit && npx eslint src --max-warnings=0 && npm test
```

## Documentation

This repo uses a set of living documents. **`DESIGN.md` is authoritative for the UI and should be kept in sync with the codebase.**

| Document | Purpose |
|---|---|
| [`DESIGN.md`](DESIGN.md) | Holo Night design system: tokens, type, layout, motion, components, do's and don'ts |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Modular monolith architecture overview |
| [`DATABASE.md`](DATABASE.md) | PostgreSQL schema overview |
| [`API.md`](API.md) | API endpoint listing |

## Scope

Built: auth (register, login, refresh), every game and sport from `GET /api/categories`, fixed-price and auction listings with photo upload, a store home (rail, featured carousel, store tabs including Top sellers ranked by paid orders, game capsules), `/categories`, a skinned hub for every game at `/c/<slug>`, browse with filters and pagination, listing detail, seller pages with real stats, bids, orders, payments, reviews, messages and rewards points.

Not built yet: logout, email verification, password reset and Google sign-in (not yet assigned to a plan). Live streaming, card grading by Atlas and shipping carrier integrations are not planned.
