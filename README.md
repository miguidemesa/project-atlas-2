# Hobby Card Marketplace Philippines

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
