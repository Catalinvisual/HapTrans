# HapCargo — agent handover

Last updated at commit `9ccc196` (+ the commit that adds this file).

## Git

- Work on `main` only. No branches.
- HEAD before this file: **`9ccc196`** `feat(planning): expose per-leg route provenance in the preflight`
- Previous: `c786256` `feat(planning): return one canonical consolidation verdict`
- `588d5af` `fix(planning): align delivery completion, equipment checks and status labels`
- Working tree is clean apart from untracked `planning-*.png` verification screenshots.

## Production deployment identities (verified, not assumed)

| Service | Live commit | How it was verified |
|---|---|---|
| API | **`c786256`**, deployment `6f2a0cab-c614-4619-bba0-cf4e29990fd7`, booted 2026-11-08T11:07:59Z | `GET https://haptrans-production.up.railway.app/api/routing-public/deployment` |
| TMS | **`c786256`** | served document meta `hapcargo-build content="c7862567df3fc6b9620873c50e50f02468a5b1b6"` |
| Website | unknown | no public URL is derivable from the repo; not verified |

`9ccc196` **is deployed**: the API later reported `9ccc1966b53dc3cc90479137e04f1a953b992a56`
and the live preflight now returns `route.legs` / `route.baselineLegs`. There is no Railway CLI,
token or project config in this environment, so any further deployment must be triggered from the
Railway dashboard by the developer (service → `server/` root → Dockerfile → Redeploy).

TMS still serves `c786256`; nothing client-side changed since, so this is expected.

## Implemented and verified

- **Canonical consolidation verdict** (`server/src/planning/consolidation-feasibility.ts`, `.spec.ts`):
  `deriveConsolidationVerdict(blockers, warnings)` returns
  `{ status: 'blocked'|'warning'|'unverified'|'feasible', overrideable, hardBlockers, warnings, unverified, codes }`
  with precedence `blocked > unverified > warning > feasible`. `EQUIPMENT_MISSING` is proven
  incompatibility; `EQUIPMENT_UNVERIFIED`, `*_UNVERIFIED`, `*_INCOMPLETE`, `STOP_COORDINATES_MISSING`,
  `TRUCK_CAPACITY_INCOMPLETE`, `ROUTE_UNVERIFIED`, `TIME_WINDOW_UNVERIFIED`, `GPS_STALE` are data gaps.
- **Preflight now returns `feasibility`** (`planning.service.ts`, `preflightConsolidation`). Verified live:

```json
"feasibility": { "status": "unverified", "overrideable": true, "hardBlockers": 0,
  "warnings": 0, "unverified": 1,
  "codes": { "blocking": [], "warning": [], "unverified": ["EQUIPMENT_UNVERIFIED"] } }
```

- **Per-leg route provenance** (`9ccc196`, not deployed): `route.legs[]` and
  `route.baselineLegs[]` with `from`, `to`, `distanceKm`, `durationMin`, `provider`.
- **Per-service Docker** (no root-level Railway config): `server/Dockerfile`, `client/Dockerfile`
  + `client/nginx.conf` (SPA fallback, no-cache `index.html`/`sw.js`, `${PORT}` template, build-id
  passed through from `RAILWAY_GIT_COMMIT_SHA`), `web/Dockerfile`, each with `.dockerignore` and
  `railway.json` (`builder: DOCKERFILE`).

## Established production facts (do not re-derive)

- `TRUCK_OVERLAP` for AR 67X WT / TRP-2026-0005 / ORD-2024007 on 2026-11-08 is **genuine**:
  committed interval `2026-11-07T14:51Z → 2026-11-08T14:03Z` (Soest → Pobiedziska driving),
  overlap **423 min**. It must stay a hard blocker.
- Trailer `VL61TWZ` is `frigo` with **no internal height**, so Mega is **UNVERIFIED**, not
  incompatible. External height (400) must never be used as proof.
- The false Stop-5 `CARGO_LEDGER_INVALID` is gone (pickup-before-delivery fix in `8d07ac2`).

## Open defect: implausible incremental distance

Live preflight for the case above:

```
baselineKm = 2152   proposedKm = 4809   addedKm = 2657   provider = here
```

**Root cause confirmed** from the deployed per-leg provenance. The proposed itinerary is the
existing route *with the candidate order appended at the tail*, not inserted into the corridor:

```
baseline legs: 1. Écully>Soest 927   2. Soest>Pobiedziska 915   3. Pobiedziska>Berlin 310
proposed legs: …same three legs…   4. Berlin>Eindhoven 654   5. Eindhoven>Brașov 2003
proposed seq : 1 pickup Écully · 2 delivery Soest · 3 pickup Pobiedziska · 4 delivery Berlin
               5 pickup Eindhoven · 6 delivery Brașov
```

The first three legs are byte-identical to the baseline (2152 km), so `incrementalRoute()` is
correct and no leg is double-counted. The 2,657 km is the **real driving cost of appending**
ORD-2024007's postings to the end of the trip: Berlin → Eindhoven (654 km) then
Eindhoven → Brașov (2,003 km).

So the defect is not routing, arithmetic or provider — it is that `preflightConsolidation`
proposes a **tail append** instead of the best insertion position, while
the corridor already runs through Pobiedziska/Soest. The UI therefore reports an
"incremental distance" that is technically the append cost but operationally misleading,
and `addedKm` is silently presented as if it were the cost of the assignment.

Fix direction (not yet implemented): make preflight delegate to the existing
`insertionPreview` position search (it already evaluates every insertion point) and return the
cheapest feasible sequence with its own `addedKm`, or explicitly label the result as an
append when no cheaper position is evaluated. Add a regression test asserting that inserting a
stop between Soest and Pobiedziska does **not** produce a Berlin→Eindhoven→Brașov tail.

## Next precise task

1. Deploy `9ccc196` (dashboard) and confirm `GET …/routing-public/deployment` reports it.
2. Call `POST /api/planning/trips/af3e9176-baca-4258-9a1b-bf6e15769854/consolidation-preflight`
   with `{ orderIds: ["7db8a596-f560-4ae5-ba49-091951c6ef77"] }` and compare `route.legs` against
   `route.baselineLegs`. The anomalous pair identifies reordering vs provider detour.
3. Fix at source (`buildProposedStops` ordering, or reject/treat a leg as unverified), add a
   regression test where baseline + two corridor stops must yield a modest `addedKm`, and never
   relabel a full-route distance as incremental.
4. Then build the Smart Consolidation preview UI (unbuilt): feasibility header, proposed sequence
   with ETA deltas, route/schedule with verified-vs-unverified markers, cargo/capacity before/after,
   equipment verdict, driver-hours availability (unavailable ≠ available), blocker/warning list with
   jump-to-stop, existing-trip vs new-trip, audited override (`warning`/`unverified` only, revalidated
   server-side at confirmation), confirm → persist → reload Planning/Trip/Order from the API.

## Not implemented (honest status)

Smart Consolidation preview UI · audited override endpoint · existing-vs-new trip decision ·
confirmation/refresh wiring · `Conflicts: 1` explanation and jump-to-stop · `provider_no_geometry`
root cause · six Calculation Results tabs and Excel/CSV/PDF exports · partial allocation (12 + 18
pallets) and rejected cargo · driver lifecycle transitions · tachograph/distance contract ·
notifications · Planning legend/label pass · mobile APK · website deployment.

## Test status (last run)

- `cd server && npx tsc --noEmit` → 0
- `npx jest src/planning` → **14 suites / 93 tests pass**
- `npm run build` (nest) → 0, `dist/main.js` present
- `cd client && npx tsc --noEmit && npm run build` → 0 (earlier, unchanged since)
- `cd web && npx tsc --noEmit && npm run build` → 0, 15 routes (earlier, unchanged since)
- Docker images cannot be built locally: Docker engine pipe `dockerDesktopLinuxEngine` is absent.

## Rules that must survive this handover

- Never reset/seed/truncate production data; `migrationsRun: false` stays.
- Never fabricate dimensions, GPS, driver activity or route geometry; missing data is UNVERIFIED.
- Never soften a genuine blocker to a warning to make an assignment possible.
- Seven locales: ro, en, nl, de, fr, es, pl. Orange `#FF5A00`. Chat and Website CMS preserved.
- Commit footer: `Generated with Codebuff 🤖` + `Co-Authored-By: Codebuff <noreply@codebuff.com>`.
