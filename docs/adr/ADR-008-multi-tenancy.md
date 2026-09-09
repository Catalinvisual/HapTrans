# ADR-008 — Multi-Tenancy

- **Status:** Accepted (TASK 02)
- **Date:** 2026-09-03

## Decision
Use a **shared-schema, shared-database, company_id-scoped** tenancy model with
server-side isolation enforced at the data-access layer. Do not use separate
databases or schemas per tenant at this stage.

## Context
The product must support multiple companies safely. Currently HAP CARGO operates
essentially one primary company but the architecture must isolate companies,
branches, and depots, and guarantee no cross-tenant data access.

## Alternatives Considered
- **Database-per-tenant** — strongest isolation but high ops/cost; overkill now.
- **Schema-per-tenant (Postgres)** — good isolation but complicates migrations,
  backups, and shared reference data; not needed yet.
- **Shared schema + RLS** — viable future hardening; adds complexity now.

## Selected Option
Shared schema, shared database; every tenant-scoped table carries a `company_id`;
isolation enforced server-side via a global query-scoping interceptor/repository
guard fed from the authenticated company context. Branch/depot scoping layered on top.

## Reasons
- Simplest correct model for a single-operator product; migrations and ops are easy.
- Server-side scoping (never frontend filtering) satisfies the security principle.
- Preserves a documented path to Postgres RLS if a stricter multi-customer SaaS
  model is later needed.

## Consequences
- Discipline: no query forgets its `company_id`; a global interceptor enforces it.
- Reference/master data may be shared; tenant data is always scoped.

## Future Implications
- RLS can be enabled later as defense-in-depth without re-architecting.
- Branch/depot scoping naturally extends the same scoping mechanics.
