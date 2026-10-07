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

## Getting Started

### 1. Start the database

```bash
docker compose up -d
# Or use a local PostgreSQL instance (see CLAUDE.md — Docker daemon may not be running)
```

### 2. Run the backend

```bash
cd backend
dotnet restore
dotnet build
cd src/Atlas.Web.Api
dotnet run --urls http://localhost:5080   # macOS AirPlay already uses port 5000
```

### 3. Run the frontend

```bash
cd frontend
npm install
npm run dev           # http://localhost:3000
```

### 4. Apply database migrations

```bash
cd backend/src/Atlas.Web.Api
dotnet ef database update
# Seed data runs automatically on first launch when DB is empty + Development env
```

## Environment Configuration

Copy `.env.example` and fill in the required values:

```bash
cp .env.example .env
```

**Important:** Change `Jwt__SecretKey` to a real 256-bit secret before going to production. See `.env.example` for the full list.

## Tests

```bash
# Backend: API tests need a disposable Postgres; ATLAS_TEST_DB must name a database containing "test"
export ATLAS_TEST_DB="Host=127.0.0.1;Port=5499;Database=atlas_test;Username=postgres"
cd backend && dotnet test

# Frontend
cd frontend && npx tsc --noEmit && npx eslint src --max-warnings=0 && npm test
```

## Documentation

This repo uses a set of living documents. **`CLAUDE.md` and `DESIGN.md` are authoritative and should be kept in sync with the codebase.**

| Document | Purpose |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Tech stack, architecture, coding conventions, domain rules, scope |
| [`DESIGN.md`](DESIGN.md) | Design system — colors, typography, motion, components, screens |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Modular monolith architecture overview |
| [`DATABASE.md`](DATABASE.md) | PostgreSQL schema overview |
| [`API.md`](API.md) | API endpoint listing |

## Scope

Built: auth (register, login, refresh), every game and sport from `GET /api/categories`, fixed-price and auction listings with photo upload, a storefront and per-game hubs, browse with filters and pagination, listing detail, seller pages with real stats, bids, orders, payments, reviews, messages and rewards points.

Not built yet: logout, email verification, password reset and Google sign-in (not yet assigned to a plan). Live streaming, card grading by Atlas and shipping carrier integrations are not planned. See `CLAUDE.md` for the roadmap.
