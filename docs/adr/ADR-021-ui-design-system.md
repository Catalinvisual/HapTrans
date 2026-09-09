# ADR-021 — UI / Design System

- **Status:** Accepted (TASK 02)
- **Date:** 2026-09-03

## Decision
Build the design system on **Radix UI primitives + Tailwind CSS + shadcn/ui
conventions + TanStack Table** (headless), rather than a monolithic component kit.

## Context
The TMS UI must be professional, premium, European, operational, modern,
information-dense, fast, and consistent, with reusable components for tables,
forms, filters, cards, tabs, drawers, dialogs, badges, alerts, and permission and
loading/empty/error states.

## Alternatives Considered
- **MUI / Ant Design** — fast start but heavy theming constraints, less control over
  the dense operational look, and weaker headless-table customization.
- **Tailwind alone from scratch** — full control but more work to ensure consistency.
- **shadcn/ui** (Radix + Tailwind + CVA) — chosen because it is unopinionated and
  produces owned, copyable components with tokens.

## Selected Option
Radix UI primitives (accessible) + Tailwind tokens + shadcn-style composable
components + TanStack Table for data grids; tokenized design (colors/typography/
spacing/radius/shadows) defined in `packages/ui`.

## Reasons
- Accessibility first (Radix) → meets keyboard/screen-reader requirements.
- Design tokens centralize colors, spacing, radius, shadows → the next task defines
  the definitive look; this stack implements it.
- Headless TanStack Table gives full control over dense operational grids, saved
  views, virtualization, and exports.

## Consequences
- Consistent component API across pages; no duplicated styling logic.
- The design system lives in `packages/ui` for reuse across web/portals.

## Future Implications
- RN app uses a separate `ui-native` package but shares the same design tokens
  where possible, keeping visual consistency.
