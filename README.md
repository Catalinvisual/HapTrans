# HAP CARGO TMS v2

Production-grade European Transport Management System.

This repository hosts two codebases:

- **HAP CARGO TMS v2** (new monorepo — NestJS API + Next.js web + Prisma/Railway) — this is the active product, deployed to Railway.
- **Legacy HapCargo SaaS** (`client/`, `server/`, `mobile/` folders) — previous marketing/React + TypeORM + Flutter app.

---

## HAP CARGO TMS v2 (monorepo)

Production-grade European Transport Management System, backed by **PostgreSQL 16 on Railway** with live analytics, fleet, OTIF, and financial reporting.

## Status / Tasks

| Task | Status |
|---|---|
| TASK 01 — Codebase audit | ✅ Complete (empty greenfield confirmed) |
| TASK 02 — Architecture & rules | ✅ Complete (this repository's docs) |
| TASK 03 — Foundation, DB, core infrastructure | ✅ Complete |
| TASK 04+ — Design System, App Shell, Navigation | ✅ Complete |
| Analytics & Finance (dashboard + financial, live data) | ✅ Complete |

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
- `DATABASE_URL` — PostgreSQL connection (dev: `postgresql://postgres:postgres@localhost:5432/hapcargo`; prod: Railway)
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

Database baseline:
- `PlatformUser` — system users with roles
- `Company` — tenant/company isolation
- `AuditLog` — append-only audit trail
- Plus operations schema: Customers, Vehicles, Drivers, Orders, Trips, Invoices, Payments

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
| `POST /api/v1/auth/login` | Login → access/refresh tokens |
| `GET /api/v1/analytics/dashboard` | Analytics dashboard (real data) |
| `GET /api/v1/analytics/financial` | Financial analytics (real data) |

### Web routes (after `npm run dev -w @hapcargo/web`)

| Route | Description |
|-------|-------------|
| `/` | Redirects to `/dashboard` |
| `/login` | Login |
| `/dashboard` | Live analytics dashboard (real data) |
| `/analytics/financial` | Financial analytics (real data) |
| `/settings` | Settings |

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

---

# Legacy HapCargo SaaS (client/ server/ mobile/)

## 🚀 Pornire rapidă

### 1. SERVER (Backend NestJS)
```powershell
cd "Saas HapCargo\server"
npm run start:dev
```
- Rulează pe: http://localhost:3001/api
- Admin: admin@hapcargo.ro / Admin2024!

### 2. CLIENT (Frontend React)
```powershell
cd "Saas HapCargo\client"
npm run dev
```
- Rulează pe: http://localhost:5173

### 3. MOBILE (Flutter APK) — necesită Flutter SDK
```powershell
# Instalare Flutter: https://docs.flutter.dev/get-started/install/windows
cd "Saas HapCargo\mobile"
flutter pub get
flutter build apk --release
# APK se găsește în: build/app/outputs/flutter-apk/app-release.apk
```

## 📱 Config mobil
- Pentru emulator Android: URL-ul serverului este `http://10.0.2.2:3001/api`
- Pentru device real: înlocuiți cu IP-ul PC-ului în rețea locală (ex: `http://192.168.1.x:3001/api`)
- Fișierul de configurat: `mobile/lib/utils/constants.dart`

## 🗄️ Baza de date
- PostgreSQL pe localhost:5432
- Database: hapcargo
- User: postgres / Laptophp20242019.
- Tabelele se creează automat la pornirea serverului (TypeORM synchronize: true)

## 🌍 Limbi suportate
- 🇷🇴 Română
- 🇬🇧 Engleză
- 🇳🇱 Olandeză

## 📁 Structura proiect
```
Saas HapCargo/
├── server/    → NestJS + TypeORM + PostgreSQL (port 3001)
├── client/    → React + Vite + Tailwind CSS (port 5173)
└── mobile/    → Flutter (APK pentru șoferi)
```

## ✅ Funcționalități complete
- Dashboard cu grafice profit/luni
- Management curse, camioane, șoferi, clienți
- Hartă live (MapLibre + OpenStreetMap)
- Chat dispecer ↔ șofer (WebSocket)
- Upload documente (CMR, Aviz, etc.)
- Facturi cu numerotare automată
- Mentenanță camioane
- Alerte expirare documente
- Raport financiar
- Localizare GPS live șoferi
- Autentificare JWT
- Switch limbă (RO/EN/NL)