# ADR-013 — Background Jobs

- **Status:** Accepted (TASK 02)
- **Date:** 2026-09-03

## Decision
Use **BullMQ on Redis** for background jobs (queues, delayed/repeatable jobs,
retries).

## Context
The system needs asynchronous work: large exports, PDF generation, email, SMS/push,
notifications, imports, OCR, report generation, scheduled reports, integration
sync, telematics processing, analytics aggregation, and AI processing.

## Alternatives Considered
- **In-process timers/setTimeout** — rejected: lost on restart, no retry/visibility.
- **node-cron only** — fine for scheduling but lacks queue/retry semantics.
- **RabbitMQ / Kafka** — full brokers; heavier than needed for a modular monolith.
- **External SaaS (Inngest/Trigger.dev)** — viable later but adds vendor dependency.

## Selected Option
BullMQ + Redis (already in the stack for caching/rate limiting), with repeatable
jobs and exponential-backoff retries.

## Reasons
- Redis is already required for caching/rate limiting → no new infra class.
- Robust: retries, delayed jobs, concurrency, worker isolation.
- Fits the modular monolith; each domain can define its own job processors.

## Consequences
- Worker processes (or in-process workers in the monolith) must be configured.
- Redis must be treated as durable enough for queue reliability (persistence on).

## Future Implications
- Long-running/heavy jobs (telematics, analytics aggregation, AI) fit the same
  queue with horizontal worker scaling if ever needed.
