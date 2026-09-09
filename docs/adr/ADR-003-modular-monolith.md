# ADR-003 — System Shape: Modular Monolith

- **Status:** Accepted (TASK 02)
- **Date:** 2026-09-03

## Decision
Build HAP CARGO TMS as a **modular monolith** — a single deployable backend
process with strongly separated in-process modules — rather than a microservices
system.

## Context
A single team builds a comprehensive European TMS. The brief (sections 41/42)
explicitly warns against premature microservices/Kubernetes/distributed complexity
without a real need.

## Alternatives Considered
- **Microservices** — rejected: added operational complexity (network, tracing,
  deployment, DB-per-service) with no demonstrated scaling need now.
- **Serverless functions** — poor fit for long-lived, stateful, transactional
  operational workflows.
- **Monolith (no modular discipline)** — rejected: would violate the "modular
  architecture" principle and cause coupled domains.

## Selected Option
Modular monolith with strict module boundaries (NestJS modules).

## Reasons
- Matches team size and current requirements (a complete single-operator TMS).
- Simpler transactions, queries, deployment, backups.
- Module boundaries preserve ownership/clarity and leave an extraction path.

## Consequences
- Cross-module calls are in-process; a shared event bus + audit service keep
  modules decoupled.
- If a future multi-tenant SaaS at very large scale emerges, high-traffic domains
  (e.g., telematics ingestion) can be extracted behind the existing API/event seams.

## Future Implications
- The outbox pattern and event contracts are designed now so splitting later
  stays possible without a rewrite.
