# ADR-014 — Event Architecture

- **Status:** Accepted (TASK 02)
- **Date:** 2026-09-03

## Decision
Use an **in-process event bus for synchronous, immediate-consistency reactions**
and **BullMQ for asynchronous side-effects** (notifications, audit enrichment,
analytics, integrations, automation, AI, webhooks). Event payloads are typed with
tenant + correlation context.

## Context
Modules must react to business events (ORDER_CREATED, TRIP_STARTED, POD_SIGNED,
INVOICE_APPROVED, PAYMENT_RECEIVED, EXCEPTION_RESOLVED, ...) without tightly
coupling producers to consumers, and without premature distributed infrastructure.

## Alternatives Considered
- **Direct method calls across modules** — rejected: couples modules.
- **Full message broker / event sourcing** — rejected: overkill / large rewrite now.
- **All-async eventing** — risk of complexity for immediate-consistency needs.

## Selected Option
Hybrid: synchronous in-process dispatch where the caller must observe the outcome;
async via BullMQ for durable side-effects.

## Reasons
- Keeps modules decoupled while staying simple for a monolith.
- Matches the principle "no premature complexity" (section 42 brief).
- Leaves an extraction path: the bus can emit to a broker later if domains split.

## Consequences
- Command-return consistency is kept synchronous; side-effects are queued.
- Correlation IDs propagate through events for observability.

## Future Implications
- Enables notifications, audit, analytics, automation, AI, and webhooks to plug in
  without touching business modules.
- Outbox pattern available if cross-service consistency is ever required.
