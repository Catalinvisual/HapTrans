# ADR-022 — Money Representation

- **Status:** Accepted (TASK 02)
- **Date:** 2026-09-03

## Decision
Store and compute monetary amounts as **fixed-point decimal in integer minor
units** via a `Money` value object, backed by PostgreSQL `numeric` (Prisma
`Decimal`) — never IEEE-754 floating point.

## Context
Financial calculations (pricing, costs, revenue, VAT, profitability, invoices)
must be deterministic, auditable, and free of floating-point drift, and must
support multiple currencies with a 3-letter ISO 4217 code.

## Alternatives Considered
- **JavaScript `number`** — rejected: floats (e.g., 0.1+0.2) cause silent cents errors.
- **Storing cents as integer** — good; a value object wraps semantics (currency, scale).
- **PostgreSQL numeric with decimals** — used for storage; math still must avoid float.

## Selected Option
`Money` value object (amount in integer minor units + currency + scale) with
add/subtract/compare/multiply-by-quantity/apply-percentage operations, persisted as
Prisma `Decimal` (numeric). All arithmetic stays integer-scaled.

## Reasons
- Deterministic, auditable, reproducible financial results (aligns with the
  financial-data principles and the "deterministic + auditable" brief requirement).
- ISO currency code always paired with amount → clean multi-currency support.

## Consequences
- Persistence layer uses Decimal; the service layer uses Money; no floats in
  finance code paths.
- Tests assert exact minor-unit values (no tolerance) for price/cost/VAT math.

## Future Implications
- Multiple currencies, exchange-rate handling, and compliance audit operate on a
  precise foundation.
