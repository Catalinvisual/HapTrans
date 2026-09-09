# ADR-002 — Backend Framework

- **Status:** Accepted (TASK 02)
- **Date:** 2026-09-03

## Decision
Use **NestJS** (Node.js + Express) as the backend API framework.

## Context
The backend must host a modular monolith with clearly separated business domains
(identity, organization, master data, commercial, orders, planning, trips, fleet,
finance, documents, etc.), strong DI, guards for auth/authZ, validation, Swagger,
and room for events and background jobs.

## Alternatives Considered
- **Express (bare)** — flexible but lacks modular structure/DI discipline; domains
  would likely couple over time.
- **Fastify** — fast, but NestJS-on-Fastify is a secondary path; Nest's module
  system is the deciding factor.
- **.NET / Java** — strong but no installed toolchain and no unified TypeScript
  contract story with the frontend/mobile.

## Selected Option
NestJS (+ Express adapter), TypeScript.

## Reasons
- Module system maps 1:1 to TMS domains → preserves the "modular architecture"
  principle (3.2).
- Guards/pipes/interceptors give first-class auth, validation, logging,
  and error shaping.
- First-class Swagger/OpenAPI generation for the API audit and future clients.
- Shares TypeScript + Zod schema with the monorepo.

## Consequences
- Adding any domain module is additive and testable in isolation.
- Must resist the temptation to place cross-cutting concerns inside domain modules.

## Future Implications
- Clean seams if a domain ever needs to be extracted to a service.
- Events, background workers, and SDK integrations integrate cleanly.
