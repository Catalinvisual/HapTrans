# ADR-004 — Database

- **Status:** Accepted (TASK 02)
- **Date:** 2026-09-03

## Decision
Use **PostgreSQL 16** as the primary database engine.

## Context
The database must support relational integrity, transactions, foreign keys,
indexes, unique constraints, migrations, auditable financial and operational
data, multi-tenant isolation, concurrency, and future integrations/reporting.

## Alternatives Considered
- **MySQL/MariaDB** — capable but weaker JSONB, advanced types, and some
  constraint/index semantics vs Postgres.
- **SQL Server / Oracle** — excellent but commercial cost and licensing; no
  installed tooling.
- **MongoDB** — rejected: transaction/relational needs and financial integrity
  demand a relational engine.

## Selected Option
PostgreSQL 16 (dev via `postgres:16-alpine` Docker image).

## Reasons
- Robust relational integrity, ACID transactions, FKs, partial/composite indexes.
- `timestamptz`, `date`, `numeric`, `jsonb`, enums, `citext`, `uuid` — all needed
  for the TMS data model.
- First-class Prisma support; huge ecosystem; free; self-hostable.
- Strong concurrency (MVCC) for high-volume operational data and reporting.

## Consequences
- Schema is the source of truth in Prisma; migrations applied via Prisma Migrate.
- All instants stored as `timestamptz` (UTC); money as `numeric` fixed-point.

## Future Implications
- Enables row-level security (RLS) later if a stricter multi-customer isolation
  model is required.
- JSONB supports flexible schemas (e.g., telematics events, metadata) without ORM churn.
