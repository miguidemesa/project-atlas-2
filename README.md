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
