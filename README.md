# NBA Card Marketplace Philippines

A production-quality Philippine online marketplace focused on NBA / basketball trading cards. Dark-first premium UI, mobile-first responsive design.

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

## Getting Started

### 1. Configure your environment

From the repository root, generate local development credentials in your shell:

```bash
export POSTGRES_PASSWORD="$(openssl rand -hex 24)"
export ConnectionStrings__DefaultConnection="Host=localhost;Port=5432;Database=atlas_marketplace;Username=postgres;Password=$POSTGRES_PASSWORD"
export Jwt__SecretKey="$(openssl rand -hex 32)"
```

Keep this shell open for the database, backend and migrations commands below.
For an existing PostgreSQL instance, use its credentials instead of generating
another database password. Changing the environment variable does not change the
password in an existing Docker database volume.

### 2. Start the database

```bash
docker compose up -d
# Or use an existing local PostgreSQL instance with the connection string above
```

### 3. Run the backend

```bash
cd backend
dotnet restore
dotnet build
cd src/Atlas.Web.Api
dotnet run            # http://localhost:5000
```

### 4. Run the frontend

In a separate terminal, from the repository root:

Without `NEXT_PUBLIC_API_URL`, the frontend starts in demo mode with sample
listing data and backend authentication disabled.

```bash
cd frontend
npm install
npm run dev           # http://localhost:3000
```

### 5. Apply database migrations

From the repository root in the shell containing your backend environment variables:

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

## Documentation

The following project documents should be kept in sync with the codebase:

| Document | Purpose |
|---|---|
| [`DESIGN.md`](DESIGN.md) | Design system — colors, typography, motion, components, screens |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Modular monolith architecture overview |
| [`DATABASE.md`](DATABASE.md) | PostgreSQL schema overview |
| [`API.md`](API.md) | API endpoint listing for Phase 0–3 |

## Scope (Phase 0–3)

In scope: auth (register/login/email verification/password reset/Google OAuth), seller profiles, NBA card listings (fixed-price + auction), image upload, home/browse feed with filters and pagination, listing details, structured search, and seed data.

The API reference and current implementation describe capabilities added after
the initial Phase 0–3 scope, including bidding, orders, payments and messaging.
