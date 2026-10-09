# Atlas

A trading card marketplace for the Philippines. Buyers and sellers list, search and buy cards, priced in pesos, with fixed-price and auction listings.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | ASP.NET Core Web API (.NET 10), C# |
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Database | PostgreSQL, Entity Framework Core |
| Auth | ASP.NET Core Identity + JWT (access and rotating refresh tokens) |
| Storage | Local filesystem in development, S3-compatible in production |
| Tests | xUnit (backend), Vitest (frontend) |

## Project structure

```
backend/            ASP.NET Core API (Domain / Application / Infrastructure / Web.Api)
frontend/           Next.js application
docs/               Architecture, database and API notes
docker-compose.yml  Local PostgreSQL
```

## Getting started

Requires the .NET 10 SDK, Node.js 24+ and PostgreSQL 14+ (or Docker).

```bash
cp .env.example .env                  # fill in the values
docker compose up -d                  # local PostgreSQL

cd backend/src/Atlas.Web.Api
dotnet run                            # API on http://localhost:5000

cd frontend
npm install
npm run dev                           # app on http://localhost:3000
```

The API applies migrations on startup. In the Development environment it also seeds sample data.

## Configuration

All settings come from environment variables or `appsettings*.json`; see [`.env.example`](.env.example) for the full list. Set `Jwt__SecretKey` to a random value of at least 32 characters, and never commit a real `.env`.

## Tests

```bash
cd backend && dotnet test
cd frontend && npm test
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [API](docs/API.md)
- [Design system](DESIGN.md)
