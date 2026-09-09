# HAP Cargo — Design System & Application Shell

This document describes the HAP Cargo design system, the shared UI foundation, and the
application shell/global navigation implemented as part of TASK 04. It is the canonical
reference for how visual and interaction primitives are defined, themed, and consumed
across the web app and the customer/carrier/driver portal surfaces.

---

## 1. Overview

The design system is delivered as a **shared UI package** (`@hapcargo/ui`) plus a
**shared Tailwind design-token preset** (`@hapcargo/config/tailwind-preset.mjs`). Both are
consumed by the main web app and by each portal app so that every surface shares the same
tokens, primitives, and component conventions while staying tree-shakable and type-safe.

Layering:

```
@hapcargo/config  →  Tailwind design-token preset (CSS variables tokenization)
@hapcargo/ui      →  React primitives + composable components (Radix-backed)
@hapcargo/web     →  App shell, global navigation, page-level composition
Customer/Carrier/Driver portals → Surface apps that reuse the same UI package
```

---

## 2. Design tokens & theming

### 2.1 Token strategy

Tokens are exposed as **CSS custom properties** in `packages/ui/src/styles.css` and mapped
to Tailwind color slots via the shared preset. This keeps a single source of truth and
enables runtime theming (e.g. dark mode through the `dark` class).

All colors are defined in OKLCH-friendly HSL and referenced as `hsl(var(--token))` so
opacity modifiers (`/50`, `/80`) continue to work.

### 2.2 Semantic color roles

| Token group              | Examples                                                                 |
| ------------------------ | ------------------------------------------------------------------------ |
| Base surface             | `background`, `foreground`, `card`, `popover`                            |
| Brand / action           | `primary`, `primary-hover`, `primary-muted`, `secondary`, `accent`       |
| Feedback                 | `success`, `warning`, `info`, `destructive` (+ `*-muted`, `*-foreground`) |
| Interaction              | `ring`, `ring-offset`, `border`, `input`                                 |
| Operational status       | `status-planned`, `status-dispatched`, `status-delayed`, `status-audit` …|

### 2.3 Operational status palette

Domain statuses map to dedicated tokens used by `StatusBadge` and tables:

| Status     | Token pair                          | Intent                       |
| ---------- | ----------------------------------- | ---------------------------- |
| planned    | `status-planned` / `*-muted`        | Scheduled, not yet active    |
| assigned   | `status-assigned` / `*-muted`       | Resources assigned           |
| confirmed  | `status-confirmed` / `*-muted`      | Booking confirmed            |
| dispatched | `status-dispatched` / `*-muted`     | Vehicle on the move          |
| active     | `status-active` / `*-muted`         | In progress                  |
| on-time    | `status-on-time` / `*-muted`        | Meeting schedule             |
| at-risk    | `status-at-risk` / `*-muted`        | Likely to slip               |
| delayed    | `status-delayed` / `*-muted`        | Late                         |
| completed  | `status-completed` / `*-muted`      | Done                         |
| cancelled  | `status-cancelled` / `*-muted`      | Voided/withdrawn             |
| exception  | `status-exception` / `*-muted`      | Needs human attention        |
| approved   | `status-approved` / `*-muted`       | Workflow approved            |
| rejected   | `status-rejected` / `*-muted`       | Workflow rejected            |

`StatusBadge` falls back to a neutral `default` style for any unrecognized status, so new
statuses degrade gracefully without missing styles.

### 2.4 Theming

- **Dark mode** is class-based (`darkMode: ['class']`) via the shared preset.
- Themes are applied by toggling the `dark` class on the root element; all tokens
  re-resolve automatically because components consume CSS variables.

---

## 3. Shared UI package (`@hapcargo/ui`)

### 3.1 Build & delivery

- Bundled with **tsup** to ESM, with generated `.d.ts` types.
- Every entry is tagged `"use client"` via a build banner so the package is safe to import
  from Server Components in the Next.js web app (prevents the `createContext`/React Server
  Component boundary error).
- Exports a top-level `@hapcargo/ui` entry (components + `cn`) and an `@hapcargo/ui/icons`
  subpath for the hand-rolled icon set.

### 3.2 Primitives & components

- **`cn`** — `clsx` + `tailwind-merge` class-name utility (deduplicates conflicting Tailwind
  classes).
- **Button** (`<Button>`) — variants (`default`, `destructive`, `outline`, `secondary`,
  `ghost`, `link`), sizes (`default`, `sm`, `lg`, `icon`), `<Button asChild>` to slot into a
  Radix `Slot` (e.g. render as a `Link`), and a `loading` state that renders an inline
  spinner, disables the button, and wraps content in a `<span>` so the `Slot` keeps a single
  child.
- **Input / Textarea / Label / Checkbox / Switch / Select** — standard form controls,
  Radix-backed where interaction states are needed.
- **Badge / StatusBadge** — badge variants plus a domain-aware status badge that
  humanizes keys (`on-time` → `On time`) and conditionally shows a status icon.
- **Card / Alert / Skeleton / Spinner** — layout and state presentational blocks.
- **Dialog / Drawer / Sheet** — modal surfaces. The `Drawer` and `Sheet` compound components
  are built over `@radix-ui/react-dialog` and accept a `side` prop
  (`left|right|top|bottom`).
- **DropdownMenu / Tabs / Tooltip** — Radix-backed navigation & discovery primitives.
- **Breadcrumb / Table** — structured content and wayfinding components.
- **DataTable** — a self-contained, dependency-light data table with:
  - typed columns (`DataTableColumn<TData>`: `accessorKey` or custom `cell` renderers);
  - loading (skeleton rows), error + retry, and empty states;
  - selectable rows, row density (`compact|standard|comfortable`), and export affordance;
  - optional pagination controls.
- **EmptyState / ErrorState / LoadingState** — consistent page-level state representations.
- **KpiCard** — metric tile used on dashboards (stat + delta + sparkline slot).
- **PageHeader / PageToolbar / SectionHeader** — page scaffolding: titles, descriptions,
  breadcrumbs, primary/secondary actions, saved views, column/density controls, export.
- **CommandPalette / GlobalSearch / NotificationCenter** — shell-level discovery surfaces
  (Ctrl/Cmd+K palette, global search, notification bell + center) wired through
  `window` custom events so they can be triggered app-wide.
- **Toaster** — `sonner`-backed toast host included once in the app shell.
- **ScrollArea** — thin, accessible scroll container.

### 3.3 Icons

A hand-rolled SVG icon set in `packages/ui/src/components/icons.tsx` (no external icon
dependency, tree-shakable, inherits `currentColor`). Icons are exported both individually
and via the `@hapcargo/ui/icons` subpath. Domain icons added for TASK 04 cover operations,
fleet, commercial, finance, documents, analytics, communication, portals, AI, and
administration navigation.

---

## 4. Application shell & global navigation

### 4.1 Layout composition

The web app is wrapped by a Server Component `layout.tsx` (exports metadata) that renders a
client `ClientLayout` (`'use client'`) providing the `I18nProvider` and the `Toaster`.
Pages under `(app)` opt into the full `AppShell` (sidebar + topbar + content + mobile
drawer).

```
<AppShell>
  <Sidebar/>            ← global navigation (collapsible)
  <Topbar/>             ← breadcrumbs, global search, notification bell, user menu, locale
  <main>{children}</main>
</AppShell>
```

### 4.2 Sidebar information architecture

`apps/web/src/components/shell/sidebar.tsx` defines `NAV_GROUPS` — the single source of
truth for the global IA. All 11 groups are present in order:

1. **Dashboard** — `/dashboard`
2. **Operations** — orders, planning, trips, dispatch, control-tower, exceptions
3. **Fleet** — vehicles, trailers, drivers, maintenance, fuel, telematics, tachograph
4. **Commercial** — customers, contacts, addresses, contracts, rates, quotations, claims,
   carriers
5. **Finance** — revenue, costs, invoices, payments, freight-audit, profitability
6. **Documents** — center, CMR, eCMR, POD, templates
7. **Analytics** — executive, operations, fleet, drivers, customers, carriers, lanes,
   financial, KPI, reports
8. **Communication** — messages, notifications, center
9. **Portals** — customer portal, carrier portal
10. **AI** — copilot, planning, exceptions, business analyst
11. **Administration** — users, roles, companies, branches, integrations, automation,
    numbering, templates, system, audit

The IA is covered by unit tests (`sidebar.test.ts`) that assert group order and unique
routes, and every route corresponds to a page under `apps/web/src/app/(app)/…`.

### 4.3 Shell behaviors

- **Collapse/expand** sidebar with persisted preference in `localStorage`.
- **Group expand/collapse** also persisted.
- **Active route** highlighting derived from `usePathname`.
- **Breadcrumbs** in the topbar built from the current pathname.
- **Keyboard**: Ctrl/Cmd+K opens the command palette; Ctrl/Cmd+B toggles the sidebar
  (broadcast via custom events).
- **Locale switcher**, **user menu**, **global search**, and **notification center** are
  part of the top-level shell chrome.
- Mobile: the shell collapses into a slide-over drawer.

---

## 5. Localization

- `react-i18next` with `I18nProvider` installed once in `ClientLayout`.
- Six locales shipped in `packages/shared/src/i18n/resources.ts` (12+ namespaces).
- Navigation labels reference `nav.*` keys (`nav.orders`, `nav.freightAudit`, …) so the
  sidebar and command palette localize automatically.
- UI-primitive copy that appears inside the component library uses `t()` from
  `react-i18next`; the developer-only `/showcase` page uses hardcoded English.

---

## 6. Accessibility

- Radix primitives provide keyboard navigation, ARIA roles/labels, focus management, and
  dialog/drawer/tooltip/dropdown semantics out of the box.
- `DataTable` exposes `role="region"` + `aria-label`, column headers with `scope="col"`,
  and `sr-only` labels for selectable columns.
- Focus rings are applied consistently (`focus-visible:ring`, `ring-offset`).
- The command palette announcements and shortcuts keep primary workflows keyboard-driven.

---

## 7. Testing

- **`@hapcargo/ui`** and **`@hapcargo/web`** run component/unit tests with **Vitest**
  (`environment: 'jsdom'`) + **Testing Library** + **jest-dom** matchers.
- `@hapcargo/ui` tests cover `cn`, `Button` (variants, loading, `asChild`/Slot),
  `Badge`, `StatusBadge`, `EmptyState`, and `DataTable` (rendering, cell renderers, empty/
  loading/error states, row click, pagination).
- `@hapcargo/web` tests validate the **global IA** via the exported `NAV_GROUPS`
  (group order, unique routes, localized labels, required anchors).
- Existing Vitest suites in `@hapcargo/shared` (money/datetime) and `@hapcargo/api`
  remain and run in the same `npm run test:unit` (Turborepo) pipeline.

All four quality gates are exercised via Turborepo:

```bash
npm run lint        # ESLint across all packages
npm run typecheck   # tsc across all packages
npm run test:unit   # Vitest across shared, api, ui, web
npm run build       # Turborepo build graph (incl. Next static export)
```

---

## 8. Extending the system

1. **Add a token** → declare the CSS variable in `packages/ui/src/styles.css` and add the
   corresponding Tailwind color slot in `packages/config/tailwind-preset.mjs`.
2. **Add a component** → create it under `packages/ui/src/components/`, export from
   `index.ts`, build with tsup (`npm run build -w @hapcargo/ui`).
3. **Add a status** → add a `status-*` token pair + a `StatusBadge` style/icon entry.
4. **Add a nav route** → add the item to `NAV_GROUPS` in the sidebar and create the page
   under `(app)`; update `sidebar.test.ts` expectations if asserting specific routes.
5. **Add tests** → co-locate `*.test.{ts,tsx}` next to the code; the package Vitest config
   picks them up automatically.
