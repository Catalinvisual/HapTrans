# ADR-018 — Deployment

- **Status:** Accepted (TASK 02)
- **Date:** 2026-09-03

## Decision
Deploy via **Docker + Docker Compose** locally, with **GitHub Actions** for CI/CD,
environments: dev → staging → production. Production DB managed (Postgres),
backups, health-checked rolling/blue-green deployment. Nothing deployed in TASK 02.

## Context
The system must be reproducible across dev/stage/prod, with environment variables,
migrations, backups, rollback, health checks, CI/CD, monitoring, and logging.

## Alternatives Considered
- **Serverless (Vercel+Lambda fully)** — viable for parts but a long-lived stateful
  monolith with Postgres/Redis/queues/workers fits a containerized host better.
- **Kubernetes now** — rejected (no premature complexity; see ADR-003).
- **Vendor-only PaaS IaaS** — no lock-in desired.

## Selected Option
Containerized services via Docker Compose (dev) and a container host (stage/prod),
GitHub Actions pipeline: lint → typecheck → test → build → migrate → deploy.

## Reasons
- Reproducible, portable, no vendor lock-in.
- Matches team size; simple rollback via image tags + DB migration reversibility.
- Prisma Migrate runs in CI before release; backups guarded by policy.

## Consequences
- Need `.env`-based config with `.env.example` (no secrets committed).
- Migrations must be backward-compatible to allow rollback.

## Future Implications
- Can move to managed Postgres/object storage or a more robust host without
  changing the app.
