# ADR-019 — Monorepo Tooling

- **Status:** Accepted (TASK 02)
- **Date:** 2026-09-03

## Decision
Use an **npm-workspaces monorepo with Turborepo** to manage `apps/*` (web, api,
driver-app, portals) and `packages/*` (shared, api-client, ui, config, database).

## Context
A single repository must hold the web app, API, shared schemas, design system,
database schema/migrations, infra, tests, and docs, with clean dependency
management and caching.

## Alternatives Considered
- **Multiple repos** — rejected: no shared TypeScript/contracts/i18n without heavy
  publish coordination.
- **Lerna/Rush** — viable, but npm workspaces + Turborepo is simpler and current.
- **pnpm workspaces** — good, but pnpm isn't installed on the host; npm workspaces
  is standard with the installed npm.

## Selected Option
npm workspaces + Turborepo (`turbo.json` task pipeline: build/lint/test/typecheck).

## Reasons
- Native npm workspaces; no extra package-manager install required (host has npm 11).
- Turborepo provides caching and parallel task execution.
- Keeps shared packages versioned together in one place.

## Consequences
- Package-boundary hygiene required (each package declares its own deps).
- Turborepo config committed; CI benefits from caching.

## Future Implications
- Adding `driver-app` and portals is just new workspace apps sharing packages.
