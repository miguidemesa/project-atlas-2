# Architecture — Modular Monolith

The marketplace is built as a **modular monolith**: a single deployable backend application with clean, layered boundaries, paired with a Next.js frontend. This keeps the marketplace simple to build and deploy while preserving the option to extract services later.

This document summarizes the project architecture. The implementation in
`backend/src` defines the current module boundaries and business rules. The visual system is in [`DESIGN.md`](DESIGN.md).

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
├── src/app/              Pages: /, /browse, /listing/[id], /sellers/[id], /sell, /orders, /messages, /admin, /login, /register, error.tsx
├── src/components/       UI by area: cards/, home/, listing/, browse/, sell/, layout/, orders/, ui/, motion/
└── src/lib/              http.ts (API client), api.ts (endpoints), types.ts, categories.ts (skins), auth.tsx, format.ts
```

- Server components by default; `'use client'` only where interactivity is required.
- TanStack Query for server state; React Hook Form + Zod for forms and client validation.
- Dark-first UI using the token system defined in `DESIGN.md`.
- All business decisions stay server-authoritative — the client never decides user ID, payment status, auction status, order status, or listing ownership.

## Workspaces

npm workspaces at the root: `frontend/`, `mobile/` and `packages/*`, with one `package-lock.json`.

- `packages/tokens` (`@atlas/tokens`): the design system's `tokens.json` and a generator writing `tokens.css` and `src/theme.ts`.
- `packages/api` (`@atlas/api`): `createClient({ baseUrl, tokenStore, onSignedOut })` with a single-flight refresh, `createEndpoints(client)`, types, format helpers, query keys, zod schemas and the foil tiers (`tierFor`). The web binds it in `frontend/src/lib/api.ts` (localStorage); the app in `mobile/src/api/client.ts` (refresh token in the Keychain or Keystore, access token in memory).
- `mobile/` (Expo SDK 57, Expo Router): routes in `src/app/` only re-export screens from feature folders (`src/store`, `src/session`, `src/me`, `src/push`, `src/update`); UI pieces in `src/ui/`; card photos, tilt and the long-press lift in `src/cards/`; springs, durations, haptics and the Reduce Motion hook in `src/motion/`.

## Push alerts

`NotificationService.NotifyAsync` is the one entry point: it writes a `notifications` row (the in-app list) and marks it `Pending` when the user allows push for its category. `PushWorker` (a hosted service) polls due rows and `PushSender` sends them through Expo's push API in batches of up to 100, retrying temporary failures at 30s, 1m, 2m and 4m and disabling tokens Expo reports as `DeviceNotRegistered`. Pushes never send inside the request that raised them. Phases P4 to P7 add their triggers by calling `NotifyAsync`.

## Key Architectural Decisions

| Decision | Choice | Why |
|---|---|---|
| Backend framework | ASP.NET Core 10 | Strong typing, EF Core, robust Identity |
| Auth | Identity + JWT access/refresh | Client-agnostic, future mobile, no CSRF surface |
| Object storage | `IObjectStorage`; local FS dev, S3 prod | Zero infra in dev, real S3 path in prod |
| User identity | Identity `AppUser` is the user row | Avoids dual-write, standard modular-monolith pattern |
| Money | `decimal(18,2)` PHP | Never floating-point for financial values |

See the design spec (§1) for the full ADR table and tradeoffs.
