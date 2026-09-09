# ADR-016 — Testing Strategy

- **Status:** Accepted (TASK 02)
- **Date:** 2026-09-03

## Decision
Adopt a layered testing strategy: **Jest/Vitest** for unit, **SuperTest** for API
integration, **Playwright** for E2E, plus specialized suites (security, localization,
PDF, export, mobile).

## Context
The TMS must be verifiable across business rules (pricing, cost, state transitions,
Money math), API/DB interactions, tenant isolation/permissions, all six languages,
generated PDFs/exports, and the critical end-to-end workflow (customer→order→plan→
trip→POD→invoice→payment→KPI).

## Alternatives Considered
- **Single framework for everything** — rejected: no one tool is ideal for both fast
  unit tests and full browser E2E.
- **Cypress only** — good E2E but heavier; Playwright chosen for speed and DX.
- **No mobile tests** — rejected: driver workflows are core.

## Selected Option
- Unit: **Vitest** (fast, TS-native) — pricing, cost, Money, state transitions.
- API/Integration: **Supertest** against NestJS with a test Postgres.
- E2E: **Playwright** — critical workflow from the brief (§30).
- Special suites: security (cross-tenant/permission denied), localization (6 langs,
  key completeness), PDF/export content, mobile (component/device later).

## Reasons
- Right tool per layer; fast feedback on business rules, trustworthy E2E for flows.
- Test DB isolated per run; deterministic money/date assertions.
- The critical E2E workflow is treated as a first-class deliverable.

## Consequences
- Factories/seed data and a CI pipeline must support running these suites.
- Money and timezone assertions need explicit decimal/UTC handling in tests.

## Future Implications
- New modules add unit + integration tests by convention (CI gate).
