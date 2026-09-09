# ADR-001 — Frontend Framework

- **Status:** Accepted (TASK 02)
- **Date:** 2026-09-03

## Decision
Use **Next.js (App Router)** + **React 19** as the web TMS frontend framework.

## Context
HAP CARGO TMS is an information-dense, operational, multilingual European TMS
(web UI, plus later customer/carrier portals). The chosen framework must support
clean routing, permission-driven layouts, a large design system, server-side
data patterns, and strong typing.

## Alternatives Considered
- **React + Vite SPA** — simpler but loses SSR/ISR/SEO benefits and requires
  manual routing/permission layout work.
- **Vue/Nuxt** — good, but a TypeScript/React ecosystem is better aligned with
  the shared typed contracts (Zod, api-client) and the mobile app.
- **Blazor/.NET** — strong, but no unified TypeScript mobile story and the host
  lacks an installed .NET SDK.

## Selected Option
Next.js App Router + React + TypeScript.

## Reasons
- App Router provides route groups, layouts, and loading/error boundaries that
  map cleanly onto ordered TMS navigation and scoped layouts.
- Production-proven, huge ecosystem, SSR/ISR ready for future portals/SEO.
- Shares TypeScript, Zod schemas, and the api-client with the rest of the monorepo.

## Consequences
- Must adopt App Router conventions; cryptographic edge runtime handled by
  running Nav|server code in Node (not a problem for an internal TMS).
- Two rendering contexts (server/client) require discipline around where async
  data and auth are read.

## Future Implications
- Customer/Carrier portals reuse the same Next.js tooling and UI package.
- Supports the command palette, saved views, and dense operational tables via
  shared packages.
