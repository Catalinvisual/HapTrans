# ADR-005 — ORM / Data Access

- **Status:** Accepted (TASK 02)
- **Date:** 2026-09-03

## Decision
Use **Prisma** as the ORM / data-access layer (Prisma Client + Prisma Migrate).

## Context
Data access must be type-safe, migration-driven, and productive, while supporting
transactions, relations, enums, indexes, and complex queries for a large TMS model.

## Alternatives Considered
- **TypeORM** — mature but more boilerplate and weaker generated-client typing.
- **MikroORM** — strong and performant, but smaller ecosystem and more manual
  mapping; less idiomatic for teams coming from Prisma/TanStack.
- **Raw SQL / Knex** — flexible but loses schema-as-code and type-safe client.

## Selected Option
Prisma with generated client + Prisma Migrate.

## Reasons
- Schema DSL → typed client; compile-time safety prevents shape typos.
- First-class nested writes and transactions for multi-step operational flows.
- Migrations are version-controlled and CI-appliable.
- Excellent TypeScript and works with an npm-workspaces monorepo (`packages/database`).

## Consequences
- Prisma is the single schema source of truth; raw SQL used sparingly for
  complex reporting queries.
- Enum support models statuses cleanly.

## Future Implications
- Composite indexes align with list/search patterns; middleware-based global
  `company_id` scoping added in TASK 03.
