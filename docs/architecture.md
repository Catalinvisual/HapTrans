# HAP CARGO TMS — Technical Architecture

> Document: `docs/architecture.md`
> Status: APPROVED (TASK 02)
> Applies to: HAP CARGO TMS v2 — greenfield implementation

This document defines the definitive technical foundation that every future
implementation task MUST follow. It covers technology, architecture, database,
API, security, documents, localization, testing, and deployment.

---

## 1. Technology Stack (Executive)

| Layer | Choice | Rationale (summary) |
|---|---|---|
| Language | **TypeScript** (strict) | One language across web, mobile, portals, API, shared packages; strong type safety; large ecosystem |
| Frontend | **Next.js 15 (App Router)** + **React 19** | SEO/routing, SSR/ISR, image optimization, App Router conventions, Vercel-compatible |
| Mobile (Driver App) | **Expo / React Native** | Reuses TypeScript + shared API client + i18n schema; offline via SQLite | 
| API backend | **NestJS** (modular monolith) | First-class module system maps directly to TMS business domains; DI; decorators for auth/validation/swagger |
| Database | **PostgreSQL 16** | Relational integrity, transactions, FKs, JSONB, robust financial/date features, mature extensions |
| ORM / data access | **Prisma** | Type-safe schema, first-class migrations, enum/prisma schema, transaction support |
| State management | **TanStack Query** (server state) + **Zustand** (UI state) | Eliminates boilerplate; cache/invalidation for server state; lightweight client state |
| Validation (shared) | **Zod** | Single-source DTO validation shared between backend & frontend |
| UI component library | **Radix UI primitives** + **Tailwind CSS** + **shadcn/ui** | Accessible primitives, tokenized design system, no lock-in, composable |
| Table | **TanStack Table** (headless) | Server-side pagination/sorting/filtering, virtualized columns, saved views |
| Charts | **Recharts** | React-friendly, sufficient for KPIs/dashboards |
| Maps / tracking | **MapLibre GL** (via react-map-gl) | Open-source map engine, self-hostable, no vendor lock-in |
| Date/time | **date-fns** + **Luxon** (timezones) | tree-shakeable; timezone math; DST-aware |
| i18n | **i18next** + **react-i18next** | Full i18n: pluralization, interpolation, fallback, six languages |
| Testing | **Jest** (unit) + **Vitest** (fast TS) + **Playwright** (E2E) + **SuperTest** (API) | Layered strategy across unit/integration/E2E |
| PDF generation | **pdfmake** (server, templated, multilingual) | Pure JS server PDF, fonts embedded, reusable templates, no native deps |
| Excel export | **ExcelJS** (XLSX) | Streaming XLSX generation, styles, multi-sheet |
| CSV / file handling | **papaparse** + **multer** | Parsing + uploads handled server-side |
| Background jobs | **BullMQ** (Redis) | Redis-backed queue, retries, scheduling, delayed jobs |
| Cache / queues | **Redis** | Queues, caching, rate limiting |
| Auth | **NestJS + Passport + JWT (HTTP-only cookies)** + **bcrypt/argon2** | Stateless JWT in secure cookies, MFA extensible |
| AuthZ | **CASL** (abilities) — permission-based, scope-aware | Declarative permission model, server-enforced + reusable client-side |
| Monorepo | **npm workspaces + Turborepo** | Single repo, shared packages, fast pipelines |
| Storage | **S3-compatible** abstraction (MinIO dev / AWS S3 prod) | Vendor-neutral object storage abstraction |
| Deployment | **Docker + Docker Compose** (dev), **CI via GitHub Actions** | Portable, reproducible; prod on managed Postgres + container host |
| Monitoring/logging | **pino** (structured logs) + **Health checks** | Structured JSON logs, correlation IDs; Prometheus/Grafana later |
| Money | **Numeric fixed-decimal (integer minor units)** | Deterministic, auditable financial math |

**Full justification for each choice** is in **Appendix B** and the corresponding ADRs.

---

## 2. Architectural Principles

1. **API-first** — all business functionality exposed through typed services/APIs; UI, mobile, portals, integrations, automation, and AI all consume the same business layer.
2. **Modular architecture** — business domains are isolated as NestJS modules (identity, organization, master data, commercial, orders, planning, trips, fleet, finance, etc.). A **modular monolith** is the chosen shape (see ADR-003).
3. **Server-enforced security** — tenant isolation and authorization are always enforced in the backend; the frontend never holds the security authority.
4. **Event-driven extensions** — modules emit domain events; notifications, audit, analytics, automation, and AI subscribe via a decoupled event layer.
5. **Auditability** — critical business and financial actions are append-only and recorded with actor, timestamp, and context.
6. **Deterministic finance** — no floating point for money; integer minor-unit representation throughout.
7. **No premature complexity** — no microservices, Kubernetes, or event brokers unless a demonstrated need arises (see principles, section 42 / ADR-003).

---

## 3. Multi-Tenancy

**Strategy: Shared-schema, shared-database with an organization-scoped (`company_id`) column on every tenant-scoped table.**

- Chosen because HAP CARGO is a single-operator TMS product where all data belongs to one primary operating company initially, but the product must safely separate multiple companies.
- **Company identity** (`company_id`) is threaded through every tenant-scoped entity.
- Every query and every write is scoped server-side using the authenticated company context (from the JWT / session).
- **Isolation is enforced at the repository / query layer** — never only by frontend filtering. A global query interceptor or per-repository guard applies `company_id` automatically.
- The full isolation mechanic is implemented in TASK 03; branch/depot scoping builds on top of the same base model.
- **Why not a separate database per tenant:** overkill for the current single-operator product, harder ops, more cost; a single shared schema with strict server-side scoping satisfies today's needs with a documented path to row-level security (RLS) later if a multi-customer SaaS offering emerges.

---

## 4. Organizational Model

Supported structure (implemented progressively in later tasks, not now):

```
Company
 ├── Branch
 │     └── Depot
 └── (Company settings, branding, defaults)
```

- A **User belongs to one or more Companies** with roles.
- Roles carry **permissions** (view/create/edit/…/financial_view…) with **scope** (company / branch / department / customer / own).
- Future roles named: SUPER_ADMIN, ADMIN, OWNER, OPERATIONS_MANAGER, PLANNER, DISPATCHER, FLEET_MANAGER, FINANCE, ACCOUNTING, DRIVER, CUSTOMER, CARRIER.

---

## 5. Database Architecture

- **Engine:** PostgreSQL 16 (Docker image `postgres:16-alpine` for dev).
- **Tenancy:** shared schema, `company_id` scoping (see section 3).
- **Data access:** Prisma schema is the source of truth; migrations generated by Prisma Migrate, applied in CI/CD.
- **Indexing:** every `company_id` + `status` + `created_at` combination that powers list/search gets a composite index; all FKs indexed; unique constraints where business identity demands.
- **Audit:** a reusable `audit_log` table + middleware/service; controlled via per-entity feature flags (see section 13).
- **Soft delete:** `deleted_at` nullable timestamp on entities where "recoverable"/"history preservation" matters; **never physical delete** for financial or audit-critical records (see section 7).
- **Financial precision:** integer minor-units via `BigInt`/`numeric`-mapped columns — see `Money` value object (section 8 + ADR-004).

### Entities that the schema must be capable of representing
Designed in later tasks in a controlled sequence (TASK 04+). Planned entity groups:

- Organization: Company, Branch, Depot, User, Role, Permission
- Master Data: Customer, Contact, Address, Contract, Rate, Quotation
- Operations: Order, OrderStop, Cargo, OrderRequirement, Trip, TripStop, TripCost, TripRevenue
- Fleet: Driver, Vehicle, Trailer, Carrier, CarrierVehicle, CarrierDriver, Maintenance, FuelTransaction, TelematicsEvent, TachographRecord
- Finance & Docs: Document, DocumentVersion, CMR, POD, Invoice, Payment, Claim, Exception
- Platform: Notification, Message, KPI, Report, Dashboard, SavedView, Automation, AuditLog, Integration

---

## 6. Data Model Principles

- Stable primary identifiers: `id uuid` (or `cuid`) with a separate human-readable business number (e.g., order number, invoice number) where required.
- Proper FKs; no over-denormalization; indexes align with access patterns.
- **Lifecycle states are distinct and explicit:**
  - **Active/Inactive** — entity exists and is usable (e.g., a rate or contract).
  - **Archived** — no longer active but retained and viewable.
  - **Cancelled** — a transaction that started but was voided (kept for audit).
  - **Soft-deleted** — `deleted_at` set; treated as removed from normal lists but retained.
  - **Permanently deleted** — only for non-critical/non-financial data, and usually only via explicit admin purge.
- Timestamps: `created_at`, `updated_at`; `created_by`, `updated_by` where relevant.
- Status history: transition log per stateful entity (see section 11).
- Versioning where required (rates, contracts, documents) → immutable revisions with a `version` number and equality/history on change.

---

## 7. Financial Data Principles

- **Money = integer major-unit? No** — we use **integer minor units** (e.g., cents) or Prisma `Decimal` mapped to a fixed precision, stored and computed as integers to avoid floating-point drift. Chosen: **Prisma `Decimal` (numeric) with a `Money` value-object that only ever does integer/decimal-scaled arithmetic.** (See ADR-004.)
- Currency: 3-letter ISO 4217 code stored alongside every monetary value (amount + currency always paired).
- VAT support: tax rates, tax-exempt flags, tax breakdown per line, tax settlement grouping.
- Flexible pricing primitives: rate tables, minimums, discounts, and surcharges (fuel, toll, waiting, extra stops, ADR, temperature, weekend/night/holiday), customer-specific and carrier-specific pricing.
- Corrections: created as **reversals/credit notes**, never silent edits to posted records.
- Determinism: recalculation functions are pure and depend only on stored inputs + parameters, so results are reproducible from source data (auditable).

---

## 8. Date, Time, Timezone

- **Storage:** all instants stored as `timestamptz` (PostgreSQL) — always timezone-aware in UTC.
- **Display:** converted to the relevant local timezone (company/branch/customer/driver) at the edge (API returns ISO-8601 UTC + the client renders in per-context tz via Luxon).
- **Date-only values** (e.g., day a rate is effective) stored as `date` (no time) to avoid DST ambiguity.
- **Appointment/ETA semantics:** planned vs actual are separate fields; ETA computed in UTC then localized.
- **Daylight saving:** handled by timezone database (Luxon/IANA) — never manual offsets.

---

## 9. Units of Measurement

- Store a **numeric value + unit** (`km`, `mi`, `kg`, `t`, `pallets`, `ldm`, `m3`, `l`, `h`, `min`, `pcs`, `°C`).
- Unit fields are enumerations / reference master data, not hard-coded strings.
- A conversion utility registry allows future conversion without schema changes. Conversions are not assumed automatically where accuracy matters (temperature/pieces never auto-convert).

---

## 10. Status / State Machine Principle

- Important entities (Order, Trip/Stop, Invoice, etc.) use **explicit status models** (enums) with a defined transition map.
- Implemented via a reusable **state-transition engine** supporting:
  - allowed transitions
  - invalid-transition prevention
  - transition permissions (role/permission-scoped)
  - transition history (actor, timestamp, reason)
  - automatic side-effects on transition (event emission, notifications)
- **Never** store status as arbitrary free text. (See section 12 events + ADR-008.)

---

## 11. Event Architecture

- **Domain events** are emitted synchronously within the originating module (in-process) and, for anything that may need to be durable/async, queued via **BullMQ**.
- Choose **synchronous for immediate consistency** (e.g., command result), **asynchronous for side-effects** (notifications, audit enrichment, analytics, integrations, AI, webhooks).
- Event names (examples): `ORDER_CREATED`, `ORDER_PLANNED`, `TRIP_ASSIGNED`, `TRIP_STARTED`, `STOP_ARRIVED`, `POD_SIGNED`, `TRIP_COMPLETED`, `INVOICE_APPROVED`, `PAYMENT_RECEIVED`, `EXCEPTION_RESOLVED`, etc.
- Events carry a typed payload + tenant context + correlation ID so subscribers are decoupled from producers.
- **Outbox pattern** reserved for cross-service consistency if the monolith later splits; not introduced now (no premature complexity).

---

## 12. Audit Architecture

- Reusable `AuditService` that records to an `audit_log` table:
  - actor, timestamp, company_id, entity, entity_id, action, previous value, new value, reason, correlation/request ID.
- Triggered for critical mutations (customer/address/contract/rate/order/price/driver/vehicle/trip replan/invoice approve/cancel/document delete/permission change, etc.).
- Middleware-level transaction logging where value; per-entity flag enables/disables sensitive-value capture.
- Audit records are **append-only** and never deleted.

---

## 13. API Architecture

- **REST** over HTTP, versioned via URI path (`/api/v1/...`).
- Resource naming: plural nouns, kebab-case, nested resources reflect ownership (`/api/v1/companies/{id}/orders`).
- Methods + status codes per HTTP semantics (200/201/204/400/401/403/404/409/422/500).
- **Validation:** Zod DTOs at the boundary (shared schema) — reject early with field errors.
- **Response format:** consistent envelope only where needed; errors always use the unified error model (section 14).
- **Pagination:** cursor-based for high-volume operational lists; page/limit for master data; always server-side.
- **Sorting/filtering/search:** query parameters; search through indexed columns / extension later.
- **Bulk operations:** dedicated endpoints (`POST /bulk`, `PATCH /bulk`) with per-item results.
- **Idempotency:** `Idempotency-Key` header honored for payment/invoice/creation endpoints.
- **Rate limiting:** per-company and per-user, Redis-backed.
- **Request correlation:** `X-Request-Id` generated and propagated; logged.
- Consumers: Web TMS, Driver App, Customer Portal, Carrier Portal, external integrations, webhooks, automation, AI.

---

## 14. API Error Standard

Unified error response:

```json
{
  "error": {
    "code": "ORDER_ALREADY_PLANNED",
    "message": "Order is already planned and cannot be modified.",
    "details": [ { "field": "status", "message": "...", "code": "INVALID_TRANSITION" } ],
    "requestId": "abc-123",
    "documentationUrl": "/docs/errors#ORDER_ALREADY_PLANNED"
  }
}
```

- Machine-readable `code`, human `message`, optional field `details`, `requestId`.
- Errors never leak passwords, secrets, DB credentials, stack traces, or internal infra info to clients.

---

## 15. Authentication

- **JWT** access tokens delivered in **HTTP-only, Secure, SameSite cookies** (reduces XSS token theft).
- Passwords hashed with **argon2id** (or bcrypt fallback).
- Support planned for: login, logout, session/token refresh, password reset (tokenized, expiring), email verification, session revocation, account lockout + rate limiting.
- **MFA** (TOTP) architecture extensible (enrollment flow + verified challenge) — added in a later task, foundation supports it.

---

## 16. Authorization

- **CASL** ability model; permissions like `view|create|edit|delete|approve|export|print|assign|plan|invoice|financial_view|financial_edit|manage_users|manage_settings`.
- Each permission carries a **scope**: company / branch / department / customer / own.
- Enforcement:
  - **Server-side**, at the controller/service boundary (authoritative).
  - Client-side CASL mirrors abilities to hide/disable UI (UX only, never authority).
- Functions: `CanI(User, Action, Subject, Data)`.

---

## 17. Document & File Architecture

- **Centralized `Document` entity** + `DocumentVersion` with: type, category, entity attachment (polymorphic `entity_type`/`entity_id`), metadata, version, permissions, retention, audit.
- **Storage abstraction** (`FileStorage` interface) supporting local FS for dev and S3-compatible object storage (MinIO/S3) for prod — modules never touch filesystem paths directly.
- Secure downloads via signed/authenticated endpoints, permission-checked; archives/retention policies.
- Document types planned: CMR, eCMR, POD, Invoice, Credit Note, Contract, Licence, Insurance, Certificate, Fuel Receipt, Damage Report, Temperature Report, Trip Sheet, Customer Report, KPI Report, Profitability Report.

---

## 18. PDF Architecture

- Centralized **`PdfService`** using **pdfmake** server-side.
- Reusable **templates** with company branding, logo, document numbering, page headers/footers, tables, signatures, QR/barcodes, **multilingual text** (RO/EN/NL/PL/FR/ES).
- Output supports download, print, and archiving to object storage.

---

## 19. Export Architecture

- Reusable **export service** supporting **XLSX (ExcelJS)**, **CSV (papaparse)**, **PDF (PdfService)**, **Print**, and later **JSON/XML/UBL/EDI**.
- Exports honor: permissions, active filters, selected columns, current view, date range, company scope.
- Large exports run as **background jobs** (BullMQ) with a downloadable result.

---

## 20. Localization

- Exactly six languages: **RO, EN, NL, PL, FR, ES**.
- **EN is the technical source**; all user-facing strings are keys via **i18next/react-i18next**.
- No hard-coded user-facing text in components; keys + `t()` everywhere.
- Covers web, driver app, portals, emails, notifications, validation messages, PDFs, reports, CMR/POD/invoices.
- Features: language fallback, pluralization, date/number/currency/timezone formatting per locale.
- Language delivered to PDFs via the same i18n resource bundle (server-side rendering of strings).

---

## 21. Search / Filter / Table Architecture

- Headless table (**TanStack Table**) with:
  - server-side search/filter/sort/pagination
  - column visibility/order/resize
  - **saved views** (filters, sorting, visible columns, grouping, date range, share/visibility)
  - grouping, bulk selection, bulk actions, export, keyboard navigation
- Reusable `DataTable`/`DataGrid` components + `SavedView` persistence entity.
- **Global search** service locates customer/contact/order/trip/vehicle/driver/carrier/invoice/document; architecture leaves room for future full-text/index expansion.
- **Command palette (Ctrl/Cmd+K)**: navigation, search, actions, recent records, shortcuts — architecture supports it; implementation later.

---

## 22. Notification Architecture

- Reusable **notification service** supporting in-app, email, SMS, push (future), driver/customer/carrier specifics.
- Notification records: template, language, recipient, priority, event, status, retry, delivery status, audit.
- Templates are i18n-based; delivery is asynchronous via BullMQ.

---

## 23. Background Jobs

- **BullMQ + Redis** queue.
- Candidate async workloads: large exports, PDF generation, email, notifications, imports, OCR, report generation, scheduled reports, integration sync, telematics processing, analytics aggregation, AI processing.
- Repeatable scheduled jobs via BullMQ repeat/cron.

---

## 24. Import Architecture

- Reusable import pipeline: **Upload → Mapping → Preview → Validation → Error Report → Confirmation → Import → Result**.
- Sources: Excel, CSV, API, and later EDI.
- Runs in background for large files, guided by a mapping/validation preview surfaced in UI. Implemented in a later task.

---

## 25. Observability

- Structured JSON logs via **pino**; request/correlation IDs; audit logs separate from operational logs.
- Health checks (`/health`, `/ready`) for container orchestration.
- HTTP/API logging; performance metrics hook (metrics endpoint) for Prometheus later.
- **Sensitive data never logged** (passwords, tokens, secrets, PII beyond need).

---

## 26. Testing Strategy

Layered:

- **Unit** (Jest/Vitest): business rules, price/cost calculation, state transitions, Money math.
- **Integration** (SuperTest + test DB): API + DB + service interactions, tenant isolation, security.
- **E2E** (Playwright): full user workflows (the critical path in section 30 of the brief).
- **Security tests:** permissions + tenant isolation (cross-company access denied).
- **Localization tests:** all six languages render; no missing keys.
- **PDF tests:** generated docs valid/non-empty; key fields present.
- **Export tests:** XLSX/CSV/PDF content correctness.
- **Mobile tests:** driver workflows (component + device-level later).
- **Critical E2E workflow to automate (later):** Create Customer → Create Order → Calculate Price → Plan → Assign Vehicle/Driver → Start Trip → Arrive → Load → Deliver → Sign POD → Complete Trip → Calculate Cost → Calculate Revenue → Profit → Create Invoice → Generate Invoice PDF → Send → Record Payment → Update KPI.

---

## 27. Security Baseline

- AuthN: strong hashing (argon2id), HTTP-only cookies, lockout, rate limiting, MFA-ready.
- AuthZ: server-enforced abilities; tenant isolation at query layer.
- Input validation (Zod) at every boundary; parameterized queries via ORM (SQL-injection safe); output encoding (React escapes by default → XSS-safe); CSRF protection for cookie-authenticated POSTs.
- File uploads validated (type, size, magic-bytes), stored outside web root with permission-controlled downloads; no arbitrary path writes.
- Secrets via environment/secret manager; **never committed**; `.env.example` only.
- Secure headers (Helmet); dependency audit in CI (`npm audit`); backups strategy (see deployment); least-privilege DB user.

---

## 28. Deployment Architecture

- **Environments:** dev (local Docker Compose) → staging → production.
- **Packaging:** Docker images; `docker-compose.yml` for dev (postgres, redis, minio, api, web).
- **Database migrations:** applied via Prisma Migrate in CI/CD before release.
- **Backups/rollback:** Postgres backups (pg_dump for dev/local; managed backups for prod); rolling/blue-green deploy capability; health checks gate traffic.
- **CI/CD:** GitHub Actions — lint, typecheck, test, build, migrate, deploy.
- **Monitoring/logging** wired via structured logs + health checks; richer metrics later.
- Nothing deployed in TASK 02.

---

## 29. Project Structure (target)

Mono-repo with npm workspaces + Turborepo:

```
hapcargo-v2/
├── apps/
│   ├── web/               # Next.js TMS web application (operational UI)
│   ├── api/               # NestJS backend (modular monolith, REST API)
│   ├── driver-app/        # Expo/React Native driver mobile app (later)
│   ├── customer-portal/   # Next.js customer portal (later)
│   └── carrier-portal/    # Next.js carrier portal (later)
├── packages/
│   ├── shared/            # shared types, DTOs, Zod schemas, i18n resources
│   ├── api-client/        # typed API client for web/mobile/portals
│   ├── ui/                # design system components (shadcn/Radix/Tailwind)
│   ├── ui-native/         # react-native UI primitives (later)
│   ├── config/            # shared config (eslint, tsconfig, tailwind)
│   └── database/          # Prisma schema, migrations, seed
├── docs/
│   ├── architecture.md    # this document
│   └── adr/               # ADR-001 .. ADR-0NN (decision records)
├── infra/
│   └── docker/            # docker-compose, Dockerfiles, init scripts
├── .github/workflows/     # CI/CD
├── .env.example           # template only, no secrets
├── package.json
├── turbo.json
└── README.md
```

Implementation of the actual code tree starts in **TASK 03** (foundation + database scaffold). This document defines the target; TASK 02 only lays groundwork docs.

---

## 30. Architecture Diagram (ASCII)

```
                    ┌──────────────────────────────────────────────────────┐
                    │                     CLIENTS                           │
                    │  ┌────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
                    │  │ Web TMS│ │ Driver   │ │ Customer │ │ Carrier  │   │
                    │  │(Next.js)│ │(ReactNat)│ │ Portal   │ │ Portal   │   │
                    │  └────────┘ └──────────┘ └──────────┘ └──────────┘   │
                    │     │            │            │            │        │
                    └─────┼────────────┼────────────┼────────────┼────────┘
                          │  shared api-client + i18n + zod        │
                          └───────────────┬────────────────────────┘
                                          ▼
                    ┌──────────────────────────────────────────────────────┐
                    │                 API  (NestJS)                          │
                    │  ┌────────────────────────────────────────────────┐  │
                    │  │ Auth │ AuthZ │ Validation │ Swagger │ Errors │  │
                    │  └────────────────────────────────────────────────┘  │
                    │  ┌────────────────────────────────────────────────┐  │
                    │  │ Business Modules (modular monolith):            │  │
                    │  │ Identity Org MasterData Commercial Contracts    │  │
                    │  │ Orders Planning Trips Dispatch Fleet Finance    │  │
                    │  │ Docs CMR POD Exceptions Comms Analytics ...     │  │
                    │  └────────────────────────────────────────────────┘  │
                    │  ┌────────────┬───────────────┬──────────────────┐  │
                    │  │ AuditService│ EventBus      │ Pdf/Export/     │  │
                    │  │             │ (in-proc)     │ Doc/Storage     │  │
                    │  └────────────┴───────────────┴──────────────────┘  │
                    └─────────────────────┬────────────────────────────────┘
             ┌─────────────┬──────────────┼───────────────┬────────────────┐
             ▼             ▼              ▼               ▼                ▼
    ┌──────────────┐ ┌───────────┐ ┌──────────────┐ ┌────────────┐ ┌──────────────┐
    │ PostgreSQL   │ │  Redis    │ │ Object Store │ │ Queue      │ │ Email/SMS/PN │
    │ (Prisma ORM) │ │ (cache/   │ │ (S3/MinIO)   │ │ (BullMQ)   │ │ (notifications)│
    │              │ │ rate/CQ)  │ │ files/PDFs   │ │ + workers  │ │              │
    └──────────────┘ └───────────┘ └──────────────┘ └────────────┘ └──────────────┘
```
*(Mermaid variant available in `docs/mermaid-architecture.md`.)*

---

## 31. ADRs

See `docs/adr/` — one file per decision:
ADR-001 .. ADR-016 covering frontend framework, backend framework, modular monolith, database, ORM, authentication, authorization, multi-tenancy, API, file storage, PDF, export, background jobs, events, mobile, testing, deployment, localization.

---

## 32. Risks

See **Appendix C** of the TASK 02 report (section K).

---

## Appendix B — Technology Justifications

- **TypeScript everywhere:** unified language across web/mobile/API/portals reduces context switching and enables shared type-safe contracts (Zod, api-client). Strong typing catches the class of null/undefined and shape bugs that plague operational software.
- **Next.js:** production-proven React framework for an information-dense operational UI; App Router gives clean route/permission/layout structure and future SSR/ISR for portals/SEO; huge ecosystem.
- **NestJS:** explicit module system is a 1:1 match for TMS domains (keeps modules decoupled — principle 3.2); DI, decorators (guards/pipes/interceptors), first-class Swagger, and TypeScript-native. Chosen over a bare Express for modularity discipline.
- **Modular monolith** not microservices: single-team product; microservices add ops/distributed complexity without benefit now; modular boundaries keep the door open to split later.
- **PostgreSQL:** mature relational DB ideal for financial + operational data, transactions, FKs, JSONB, robust and free; the de-facto choice for Postgres-compatible Prisma support.
- **Prisma:** type-safe, migration-first schema; developer productivity; excellent TS integration; generated client prevents SQL typos.
- **Radix + Tailwind + shadcn** over a full kit (MUI/Ant/Datagrid): accessible primitives + tokenized Tailwind design system, no lock-in, matches the custom "premium operational" design direction, and headless TanStack Table for full control over dense operational grids.
- **Zod** shared: single DTO/validation source web↔API.
- **TanStack Query / Zustand:** standard, minimal-but-powerful server/client state split; avoids boilerplate and stale-cache bugs.
- **BullMQ + Redis:** simple, robust, self-hostable job/queue layer; fits a monolith without a broker.
- **pdfmake / ExcelJS / papaparse / multer:** mature, pure-JS, no native build pain on Windows/CI, cover multilingual PDF, styled XLSX, CSV, upload.
- **CASL:** declarative, scope-aware permission model that mirrors between server and client.
- **i18next:** full i18n with plural/fallback; supports six languages and both server (PDF/email) and client rendering.
- **Docker + Compose + GitHub Actions:** reproducible dev/stage/prod; no cloud lock-in; simple to operate for a smaller team.
- **pino:** fast structured JSON logging, standard, low vendor lock-in.

---

## Appendix C — Decision Records Index

| ADR | Topic | Decision |
|---|---|---|
| ADR-001 | Frontend framework | Next.js (App Router) |
| ADR-002 | Backend framework | NestJS + Express |
| ADR-003 | System shape | Modular monolith |
| ADR-004 | Database | PostgreSQL 16 |
| ADR-005 | ORM / data access | Prisma |
| ADR-006 | Authentication | JWT in HTTP-only cookies + argon2id |
| ADR-007 | Authorization | CASL abilities, scope-aware |
| ADR-008 | Multi-tenancy | Shared schema, company_id scoping |
| ADR-009 | API architecture | REST, /api/v1, Zod, unified errors |
| ADR-010 | File storage | S3-compatible abstraction (MinIO/S3) |
| ADR-011 | PDF generation | pdfmake server-side templates |
| ADR-012 | Export generation | ExcelJS + papaparse + PdfService |
| ADR-013 | Background jobs | BullMQ + Redis |
| ADR-014 | Event architecture | In-process sync + BullMQ async |
| ADR-015 | Mobile architecture | Expo/React Native |
| ADR-016 | Testing strategy | Jest/Vitest + SuperTest + Playwright |
| ADR-017 | Localization | i18next, 6 languages, EN source |
| ADR-018 | Deployment | Docker + Compose + GitHub Actions |
| ADR-019 | Monorepo tooling | npm workspaces + Turborepo |
| ADR-020 | State management | TanStack Query + Zustand |
| ADR-021 | UI/design system | Radix + Tailwind + shadcn + TanStack Table |
| ADR-022 | Money representation | Numeric fixed-point (minor units) |

---

*End of HAP CARGO TMS Technical Architecture (TASK 02).*
