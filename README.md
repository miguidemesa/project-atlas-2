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
dotnet run            # http://localhost:5000
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

## Documentation

This repo uses a set of living documents. **`CLAUDE.md` and `DESIGN.md` are authoritative and should be kept in sync with the codebase.**

| Document | Purpose |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Tech stack, architecture, coding conventions, domain rules, scope |
| [`DESIGN.md`](DESIGN.md) | Design system — colors, typography, motion, components, screens |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Modular monolith architecture overview |
| [`DATABASE.md`](DATABASE.md) | PostgreSQL schema overview |
| [`API.md`](API.md) | API endpoint listing for Phase 0–3 |

## Scope (Phase 0–3)

In scope: auth (register/login/email verification/password reset/Google OAuth), seller profiles, NBA card listings (fixed-price + auction), image upload, home/browse feed with filters and pagination, listing details, structured search, and seed data.

Explicitly out of scope for Phase 0–3: payments, order lifecycle, bidding/auction lifecycle (write), messaging, reviews, wishlist/favorites, live auctions, card grading, shipping integrations. See `CLAUDE.md` for the full scope.
