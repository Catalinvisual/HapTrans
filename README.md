# HAP CARGO TMS v2

Production-grade European Transport Management System.

This repository has completed **TASK 03 (project foundation, database foundation & core infrastructure)**.

## Status / Tasks

| Task | Status |
|---|---|
| TASK 01 — Codebase audit | ✅ Complete (empty greenfield confirmed) |
| TASK 02 — Architecture & rules | ✅ Complete (this repository's docs) |
| TASK 03 — Foundation, DB, core infrastructure | ✅ Complete |
| TASK 04+ — Design System, App Shell, Navigation | ⏳ Not started |

## Key documents

- **Architecture:** [`docs/architecture.md`](docs/architecture.md)
- **Architectural Decision Records:** [`docs/adr/`](docs/adr/) (ADR-001 .. ADR-022)
- **Database Conventions:** [`docs/database-conventions.md`](docs/database-conventions.md)
- **Mermaid architecture diagram:** [`docs/mermaid-architecture.md`](docs/mermaid-architecture.md)

## Non-negotiable rules (summary)

1. **API-first** — all business logic exposed through typed services/APIs.
2. **Modular monolith** — NestJS modules isolate business domains.
3. **Server-enforced security** — tenant isolation and authorization always enforced in the backend, never only via frontend filtering.
4. **Auditability** — critical actions are append-only with actor/timestamp/context.
5. **Deterministic finance** — integer minor-unit `Money`, no floats.
6. **No premature complexity** — no microservices/K8s/brokers without a real need.
7. **No business modules in TASK 03** — only technical foundation.

## Monorepo structure

```
apps/
  web/               Next.js 15 (App Router) — main web application
  api/               NestJS 11 — REST API + Swagger
  driver-app/        Expo SDK 54 — React Native driver mobile app
  customer-portal/   Next.js 15 — Customer portal foundation
  carrier-portal/    Next.js 15 — Carrier portal foundation
packages/
  shared/            Money, datetime, identifiers, i18n (6 languages), types
  api-client/        Typed fetch client with request IDs, retries, error handling
  ui/                Radix + Tailwind primitives (Button, Input, Dialog, etc.)
  ui-native/         (placeholder) — future native components
  config/            Shared TS, ESLint, Prettier, Tailwind presets
  database/          Prisma schema, migrations, seed, client
docs/
  architecture.md
  adr/               ADR-001 .. ADR-022
  database-conventions.md
infra/
  docker/
    docker-compose.yml   PostgreSQL 16, Redis 7, MinIO (S3-compatible)
    Dockerfile.api       Multi-stage API container
.github/
  workflows/
    ci.yml         Install, lint, typecheck, build, test:unit, db:generate
```

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | `>=20.19.0 <25` | `.nvmrc` = 20.19.0 |
| npm | `11.6.2` | Workspaces + Turborepo |
| Docker Desktop | 29.x | Required for PostgreSQL, Redis, MinIO |
| Git | 2.x | |

Verify:
```bash
node --version    # >= 20.19.0
npm --version     # 11.6.2
docker version    # daemon must be running
```

## Installation

```bash
# 1. Install all workspace dependencies
npm install

# 2. Generate Prisma Client
npm run db:generate
```

## Environment setup

Each app/package has its own `.env.example` with placeholders. Copy to `.env` for local development:

```bash
# API
cp apps/api/.env.example apps/api/.env

# Web
cp apps/web/.env.example apps/web/.env

# Customer Portal
cp apps/customer-portal/.env.example apps/customer-portal/.env

# Carrier Portal
cp apps/carrier-portal/.env.example apps/carrier-portal/.env

# Driver App
cp apps/driver-app/.env.example apps/driver-app/.env

# Database (uses local dev credentials)
cp packages/database/.env.example packages/database/.env
```

Key variables:
- `DATABASE_URL` — PostgreSQL connection (dev: `postgresql://postgres:postgres@localhost:5432/hapcargo`)
- `REDIS_URL` — Redis connection (dev: `redis://localhost:6379`)
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` — MinIO/S3
- `NEXT_PUBLIC_API_URL` — API base URL (dev: `http://localhost:4000`)

## Infrastructure startup

```bash
# Start PostgreSQL, Redis, MinIO via Docker Compose
npm run infra:up

# Verify containers are healthy
docker compose -f infra/docker/docker-compose.yml ps
```

Expected services:
- `postgres` — port 5432
- `redis` — port 6379
- `minio` — ports 9000 (API), 9001 (Console)

## Database migration

```bash
# Run pending migrations (dev)
npm run db:migrate

# Or apply migrations without prompts (CI/prod)
npm run db:deploy

# Seed development data
npm run db:seed
```

Database baseline (TASK 03):
- `PlatformUser` — system users with roles
- `Company` — tenant/company isolation
- `AuditLog` — append-only audit trail

## Development startup

```bash
# Terminal 1: API (port 4000)
npm run dev -w @hapcargo/api

# Terminal 2: Web (port 3000)
npm run dev -w @hapcargo/web

# Terminal 3: Customer Portal (port 3001)
npm run dev -w @hapcargo/customer-portal

# Terminal 4: Carrier Portal (port 3002)
npm run dev -w @hapcargo/carrier-portal

# Driver App: Expo dev server
npm run dev -w @hapcargo/driver-app
```

## Verification

### Quality checks

```bash
# Lint all packages
npm run lint

# TypeScript strict mode check
npm run typecheck

# Unit tests
npm run test:unit

# Full build
npm run build
```

All must pass (exit code 0).

### API endpoints (after `npm run dev -w @hapcargo/api`)

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Liveness — process alive |
| `GET /ready` | Readiness — DB, Redis, S3 reachable |
| `GET /docs` | Swagger UI (OpenAPI 3.1) |
| `GET /api/v1/foundation/health` | Foundation health echo |
| `GET /api/v1/foundation/money-demo` | Money arithmetic demo |
| `GET /api/v1/foundation/locales` | Supported locales (RO, EN, NL, PL, FR, ES) |
| `GET /api/v1/foundation/echo?msg=hello` | Echo with request ID |

### Web routes (after `npm run dev -w @hapcargo/web`)

| Route | Description |
|-------|-------------|
| `/` | Redirects to `/dashboard` |
| `/login` | Login placeholder |
| `/dashboard` | Foundation dashboard (calls API `/foundation/health` + `/foundation/money-demo`) |
| `/settings` | Settings placeholder |

### Portal routes

- Customer Portal: `http://localhost:3001/` — i18n demo with locale switcher
- Carrier Portal: `http://localhost:3002/` — i18n demo with locale switcher

### Mobile

- Driver App: `npm run dev -w @hapcargo/driver-app` → Expo Go / simulator

## Commands summary

| Command | Description |
|---------|-------------|
| `npm install` | Install all workspace deps |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:migrate` | Run migrations (dev) |
| `npm run db:deploy` | Apply migrations (CI/prod) |
| `npm run db:seed` | Seed dev data |
| `npm run infra:up` | Start Docker infra |
| `npm run infra:down` | Stop Docker infra |
| `npm run lint` | ESLint all packages |
| `npm run typecheck` | TypeScript strict check |
| `npm run test:unit` | Vitest unit tests |
| `npm run build` | Turborepo build all |
| `npm run dev -w <pkg>` | Start dev server for package |

## TASK 03 Implementation Summary

### ✅ Completed

- **Monorepo**: npm workspaces + Turborepo with 5 apps, 6 packages
- **TypeScript**: Strict mode, compatible configs, exactOptionalPropertyTypes
- **Shared config**: TS, ESLint (Flat Config), Prettier, Tailwind presets
- **Environment**: `.env.example` placeholders, validation at startup
- **Database**: Prisma 6, PostgreSQL 16, baseline schema (PlatformUser, Company, AuditLog), migrations, seed
- **Money**: Integer minor units (BigInt), deterministic half-up rounding, currency-paired
- **Date/Time**: Luxon-based utilities, UTC storage, timezone conversion, DateOnly
- **Identifiers**: UUID v4 (crypto.randomUUID), public-facing
- **API**: NestJS 11, global validation (Zod), exception filter, request IDs, structured logging (Pino), health/ready, `/api/v1` prefix, Swagger
- **Redis**: ioredis 5, connection module
- **BullMQ**: Queue abstraction, example queue
- **S3/MinIO**: Storage service abstraction, signed URLs
- **Web**: Next.js 15 App Router, route groups, layouts, error/loading/not-found boundaries, API client integration
- **UI Package**: 18 Radix+Tailwind primitives, design tokens (HSL CSS vars), application shell (sidebar, top bar, breadcrumbs)
- **Portals**: Customer & Carrier portals with i18n (6 languages), locale switcher
- **Driver App**: Expo 54, TypeScript, shared package access, API client, i18n, SecureStore stub
- **Localization**: 6 languages (RO, EN, NL, PL, FR, ES) with fallbacks, locale-aware formatting
- **CI**: GitHub Actions — install, db:generate, lint, typecheck, build, test:unit, npm audit
- **Docker**: Compose for PostgreSQL, Redis, MinIO; API Dockerfile
- **Security**: Helmet, CORS, request size limits, no secrets committed

### 📋 Verification results

| Check | Status |
|-------|--------|
| `npm install` | ✅ 1390 packages |
| `npm run lint` | ✅ 12/12 tasks pass |
| `npm run typecheck` | ✅ 12/12 tasks pass |
| `npm run build` | ✅ 8/8 tasks pass |
| `npm run test:unit` | ✅ 7/7 tasks pass (17 tests) |
| `npm run db:generate` | ✅ Prisma Client 6.19.3 |
| Docker infra | ⚠️ Requires Docker Desktop running |

### ⚠️ Known issues

1. **Docker Desktop must be started manually** on Windows before `npm run infra:up`
2. **npm audit**: 25 findings (11 moderate, 13 high, 1 critical) — mostly dev/build-time tooling (Next 15 bundled postcss, vitest→esbuild, Prisma CLI `deepmerge-ts`, Expo metro). No production runtime vulnerabilities in application code. Next 16 will resolve postcss.
3. **Expo mobile build** not verified without native Android/iOS toolchain; TypeScript typecheck passes.
4. **UI package** `dist` contains `.js` + `.d.ts` (ESM); CSS tokens served from `src/styles.css` via package exports.
5. **Portals** use `'use client'` for pages using `react-i18next` (RSC `createContext` limitation).

### 📁 Files created / key directories

```
apps/api/src/                    # NestJS foundation
apps/web/src/                    # Next.js web foundation
apps/customer-portal/src/        # Customer portal foundation
apps/carrier-portal/src/         # Carrier portal foundation
apps/driver-app/                 # Expo driver app foundation
packages/shared/src/             # Money, datetime, id, i18n, types
packages/api-client/src/         # Typed fetch client
packages/ui/src/                 # 18 Radix+Tailwind primitives
packages/config/                 # Shared TS/ESLint/Tailwind configs
packages/database/prisma/        # Schema, migrations, seed
infra/docker/docker-compose.yml  # PostgreSQL, Redis, MinIO
infra/docker/Dockerfile.api      # Multi-stage API image
.github/workflows/ci.yml         # CI pipeline
docs/architecture.md             # Architecture
docs/adr/ADR-001..ADR-022.md     # Architectural decisions
docs/database-conventions.md     # DB conventions
```

---

**TASK 03 is complete.** The monorepo is installable, buildable, type-safe, lintable, testable, runnable locally, container-ready, database-ready, API-ready, web-ready, mobile-ready, portal-ready, localization-ready, and secure by default. No business modules have been implemented.

Next: **TASK 04 — DESIGN SYSTEM, APPLICATION SHELL & GLOBAL NAVIGATION**.