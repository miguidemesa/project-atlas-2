# Architecture — Modular Monolith

The marketplace is built as a **modular monolith**: a single deployable backend application with clean, layered boundaries, paired with a Next.js frontend. This keeps Phase 0–3 simple to build and deploy while preserving the option to extract services later.

This document summarizes the project architecture. The implementation in
`backend/src` defines the current module boundaries and business rules.

## Backend — ASP.NET Core

Four projects behind a single solution (`backend/Atlas.sln`):

```
backend/
├── src/
│   ├── Atlas.Domain/           Pure entities, enums, value objects, domain exceptions — no dependencies
│   ├── Atlas.Application/      Service interfaces + implementations, DTOs, FluentValidation, Mapster
│   ├── Atlas.Infrastructure/   EF Core DbContext, migrations, Identity, object storage, email, JWT
│   └── Atlas.Web.Api/          Controllers, middleware, DI wiring, Program.cs
└── tests/
    ├── Atlas.Tests.Unit/       Pure domain/application logic tests
    ├── Atlas.Tests.Integration/ EF Core + real PostgreSQL tests
    └── Atlas.Tests.Api/        WebApplicationFactory endpoint tests
```

### Layer rules

- **Domain** has zero dependencies and owns the business invariants (domain rules are enforced server-side).
- **Application** orchestrates use cases and never touches HTTP or EF Core directly.
- **Infrastructure** implements persistence, Identity, storage, email, and token concerns.
- **Web.Api** is the composition root — controllers stay thin, all wiring happens in `Program.cs` / DI.

Dependency flow: `Web.Api → Infrastructure → Application → Domain`. Domain never references the outer layers.

### Cross-cutting concerns

- **Serilog** structured JSON logging with request correlation IDs (`X-Request-Id`).
- **Global exception handler** returning RFC 7807 `ProblemDetails`.
- **JWT** access tokens (15 min) + rotating refresh tokens (30 days), server-revokable.
- **`IObjectStorage`** abstraction — local filesystem in dev, S3 in production.
- **`IEmailSender`** abstraction — console-log in dev, SMTP stub until a provider is wired up.

## Frontend — Next.js App Router

```
frontend/
├── src/app/              Pages and route groups: (auth)/, (feed)/, listings/[id], listings/new, account
├── src/components/        Reusable UI (ui/, cards/, listings/, auctions/, sellers/, search/, nav/, charts/)
├── src/features/          Feature-scoped hooks and components (auth/, listings/, search/)
├── src/lib/               API client, auth context, formatters, utilities
└── src/hooks/             Shared hooks (infinite scroll, media query)
```

- Server components by default; `'use client'` only where interactivity is required.
- TanStack Query for server state; React Hook Form + Zod for forms and client validation.
- Dark-first UI using the token system defined in `DESIGN.md`.
- All business decisions stay server-authoritative — the client never decides user ID, payment status, auction status, order status, or listing ownership.

## Key Architectural Decisions

| Decision | Choice | Why |
|---|---|---|
| Backend framework | ASP.NET Core 10 | Strong typing, EF Core, robust Identity |
| Auth | Identity + JWT access/refresh | Client-agnostic, future mobile, no CSRF surface |
| Object storage | `IObjectStorage`; local FS dev, S3 prod | Zero infra in dev, real S3 path in prod |
| User identity | Identity `AppUser` is the user row | Avoids dual-write, standard modular-monolith pattern |
| Money | `decimal(18,2)` PHP | Never floating-point for financial values |

See the design spec (§1) for the full ADR table and tradeoffs.
