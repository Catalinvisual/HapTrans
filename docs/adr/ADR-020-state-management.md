# ADR-020 — State Management

- **Status:** Accepted (TASK 02)
- **Date:** 2026-09-03

## Decision
Use **TanStack Query** for server state and **Zustand** for lightweight client/UI
state on the web TMS.

## Context
The operational UI has heavy server-driven lists/forms; caching, invalidation,
pagination, and mutations must be handled cleanly without a heavyweight global store.

## Alternatives Considered
- **Redux Toolkit (full)** — heavier boilerplate; more than needed for server state.
- **Zustand for everything** — poor fit for server-cache/query semantics.
- **SWR** — good, but TanStack Query offers richer mutation/invalidation + infinite
  query support.

## Selected Option
TanStack Query for server data + Zustand for transient UI state (drawers, filters
draft, command palette, current selections).

## Reasons
- TanStack Query handles caching, background refetch, optimistic updates, and
  infinite/cursor pagination with little boilerplate.
- Zustand keeps client state tiny and accessible outside React (command palette,
  drawers).

## Consequences
- Server data is never duplicated into a global store (single source: Query cache).
- Query invalidation keys must be consistent (shared `queryKeys` helpers).

## Future Implications
- RN driver app benefits from the same data pattern; api-client is shared.
