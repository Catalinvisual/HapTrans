# HapCargo — agent handover

Last updated with the confirmation-atomicity milestone on top of
`fix(planning): insert orders at the best feasible position` (`4fc81e1`, previous `2940881`).

## Git

- Work on `main` only. No branches.
- History: `2940881` (append-cost diagnosis) → `4fc81e1` (insertion search + wizard) → this commit
  (transactional, idempotent, revalidated confirmation).
- The untracked `planning-*.png` verification screenshots are user files and must stay untracked.

## What `4fc81e1` changed (unchanged by this milestone)

### 1. Smart Consolidation searches insertion positions (the 2,657 km defect)

The defect was **not** HERE/ORS routing and **not** `incrementalRoute()`: `preflightConsolidation`
appended the candidate order to the tail of the existing itinerary (Berlin → Eindhoven 654 km +
Eindhoven → Brașov 2,003 km = 2,657 km) and reported that append cost as `addedKm`.

- `server/src/planning/consolidation-proposal.ts` (`buildConsolidationProposal`) delegates to the
  existing `evaluateInsertion` position search (`stop-insertion.ts`), so every pickup/delivery pair
  is evaluated against pickup-before-delivery, per-order dependencies, cargo on board, capacity, time
  windows and driver time. The cheapest **feasible** position wins.
- `consolidationCapacity` was split so `consolidationCapacityForSequence()` accepts an already
  decided sequence (`consolidation-cargo.ts`, `prepareLedgerStops()` exported).
- `resolveLegResolver()` resolves each stop pair once and is shared by the search and
  `routeForStops()`, so the proposal and its totals cannot disagree and no leg is routed twice.
- Multi-day driving is modelled (9 h/day, 45 min break after 4.5 h, 11 h daily rest,
  `methodology = 'eu_561_2006_planning_model'`); tachograph availability stays `unverified`.
- Pre-existing window misses become `PRE_EXISTING_WINDOW_MISS` warnings; a window that was met before
  the insertion and is missed after it stays a hard `STOP_WINDOW_MISSED`.
- The preflight returns `insertion` (recommended + alternatives with their own `addedDistanceKm` and
  `stopOrder`), `schedule`, `equipment` and `driverHours.scheduleModel`; blockers/warnings are
  deduplicated by code + order + stop + field before the verdict.

### 2. Smart Consolidation wizard

`client/src/components/ConsolidationWizard.tsx` replaces the inline modal. It renders exclusively
from the backend payload: verdict header, selectable recommended/alternative sequences with per-stop
arrival/departure/ETA delta/window status, route provenance (baseline/proposed/added), schedule
(waiting, breaks, daily rest, duty days, "not tachograph" note), cargo before/after against recorded
limits (`—` when a limit is null), truck/trailer identity with Fleet deep link, per-requirement
equipment verdicts, driver hours as `unverified`, every conflict with its raw params and a
jump-to-order action, and a required override reason for `warning`/`unverified` verdicts.

## This milestone: confirmation is atomic, idempotent and revalidated

### 1. One transaction (`planning.service.ts`, `assignOrders`)

- `DataSource` is injected. The whole write path runs in `dataSource.transaction(...)`: new trip row
  and trip number, order assignment (`trip`/`status`), `rebuildStops`, `applyConfirmedStopOrder`,
  `recalculateTrip` (ETA, planned departure/arrival, distance, cargo) and both audit rows.
  Any failure rolls all of it back — no orphan trip, no rebuilt stops without their schedule, no
  assignment without its audit.
- Repositories are resolved per transaction through `tripRepoFor/stopRepoFor/taskRepoFor/orderRepoFor`
  (`manager.getRepository(...)`), threaded as an optional `EntityManager` into `loadTrip`,
  `nextTripNumber`, `rebuildStops`, `applyConfirmedStopOrder`, `recalculateTrip` and
  `calculateTripDistance`. Without the manager they behave exactly as before.
- Outside the transaction, after it commits: `recalculateCosts` (derived breakdown, best effort),
  `logTimeline` (TimelineService cannot join a transaction) and `recordUndo`.

### 2. Idempotency (`confirmationKey`)

- The client sends one `confirmationKey` per reviewed proposal (`crypto.randomUUID()`, regenerated
  when the wizard is reopened, when `PROPOSAL_CHANGED` forces a re-review, and on mode switch).
- Server: `normalizeConfirmationKey` accepts an opaque 8–128 char `[A-Za-z0-9_-]` token and rejects
  anything else with `CONFIRMATION_KEY_INVALID`.
- A committed-key lookup returns the already committed trip **before** order validation, so a retry
  after a timeout succeeds instead of failing with "already planned" or allocating twice.
- Inside the transaction the key is serialised with `pg_advisory_xact_lock(hashtext(key))` and looked
  up again, then an `assignment_confirmation` row is written in the same transaction; it exists only
  for a confirmation that committed. No schema change, no migration.

### 3. Revalidation immediately before persistence

- The preflight re-runs on every confirmation (`BLOCKED` cannot be overridden; the verdict and
  `overrideable` are recomputed server-side), and the override codes must match the current soft
  codes exactly.
- New in `preflightConsolidation`: committed-activity revalidation for **truck**, **trailer** and
  **driver** against every other active trip over the trip interval — `TRUCK_OVERLAP`,
  `TRAILER_OVERLAP`, `DRIVER_OVERLAP` (with overlap start/end/minutes). They are hard blockers.
- Driver-hour limits are checked with `isDriverAvailable` over the planned window **only when
  recorded driving/rest periods exist**; missing tachograph data stays `unverified` and never becomes
  a blocker, and is never read as unlimited availability either.
- Cargo capacity, equipment compatibility, stop windows and trip status keep their existing
  blocking/warning split; `EQUIPMENT_MISSING` blocks, missing body data stays `EQUIPMENT_UNVERIFIED`.

### 4. Override audit (`server/src/planning/assignment-confirmation.ts`)

- `buildOverrideAudit` derives `decidedBy` from the authenticated user only and throws
  (`OVERRIDE_REASON_REQUIRED` / `OVERRIDE_USER_REQUIRED`) when the reason or the user is missing.
  Because it runs inside the transaction, the assignment is rolled back instead of being accepted
  without a valid audit.
- Record (`planning_actions`, `action = 'assignment_override'`, no migration): `beforeState` = trip,
  trip number, order ids, full verdict, verdict status, deduplicated codes; `afterState` = decision,
  exact reason, accepted codes, verdict status, trip/order/truck/trailer ids, `decidedBy`, ISO
  `decidedAt`.

### 5. Sequence verification (`assignment-confirmation.ts`)

- `validateInsertionSequence` rejects a duplicate key (`STOP_ORDER_DUPLICATE`), a different stop set
  (`STOP_ORDER_MISMATCH`) and any delivery before its own pickup (`STOP_ORDER_INVALID`). It is applied
  to the reviewed `dto.preview.stopOrder` and again to the persisted `dto.stopOrder`, so both the
  recommended and every alternative sequence are checked.
- `isAcceptableReviewedSequence` accepts the recommended sequence, any alternative, or a permutation
  of the same stop set; anything else is `PROPOSAL_CHANGED`.

## Verified in this milestone (local, this machine)

- `cd server && npx tsc --noEmit` → **0**
- `cd server && npx jest src/planning` → **16 suites / 117 tests pass** (was 15 / 106; new
  `assignment-confirmation.spec.ts` adds 11 tests: key normalisation, duplicate/mismatch/
  delivery-before-pickup, alternative permutation acceptance, changed-stop-set detection, audit
  identity/codes/reason/timestamp, and refusal without a user or reason).
- `cd server && npm run build` → **0** (`nest build`)
- `cd client && npx tsc --noEmit` → **0**
- `cd client && npm run build` → **0** (PWA generated, 101 precache entries)
- Translations: the dictionary module was loaded and compared across all seven locales — 68 keys in ro, en, nl, de, fr, es, pl with identical key sets, no missing, extra or empty entries. The 21
  other labels used by `ConsolidationWizard.tsx` (`cons_title`, `stops`, `sched_waiting`, …) resolve
  from the base catalogue in `client/src/lib/i18n.ts`, where each is defined for all seven locales.

## Not verified / blocked (no deployment access)

- **Not deployed.** Production still serves commit `2940881`:
  `GET https://haptrans-production.up.railway.app/api/routing-public/deployment` →
  `{"commit":"29408818e9daef60a2989dc7bbcda9783c3332de", ...}`. No `railway` CLI and no Railway token
  exist in this environment, so nothing was deployed and no deployment is claimed.
- **Production scenario not executed**: `POST /api/planning/trips/af3e9176-baca-4258-9a1b-bf6e15769854/consolidation-preflight`
  needs a JWT, and no credentials are available here.
- **Production Planning not opened**: the only reachable host is the API
  (`haptrans-production.up.railway.app`), which answers `Cannot GET /`; `haptrans.up.railway.app` and
  `haptrans-tms.up.railway.app` do not exist. The TMS URL is unknown to this environment.
- **No duplicate-confirmation test against production** — forbidden by the milestone, and there is no
  local Postgres to run the transaction against. The transaction/advisory-lock path is compiled and
  covered by the pure-rule tests only; it must be exercised on a non-production database.
- Truck/trailer/driver overlap checks were added to the preflight **without** seeing the live payload.
  The genuine 423-minute `AR 67X WT` / `TRP-2026-0005` overlap will now surface as `TRUCK_OVERLAP`
  (blocking) in the wizard; that is intended, and must be confirmed on the real data after deploy.

## Deployment (dashboard, exact)

Railway → project **HapCargo** → `main` @ `4fc81e1` (or this commit).

1. Service **API**: root directory `server/`, builder **Dockerfile** (`server/Dockerfile`),
   `npm run build` + `node dist/main.js`, start command unchanged. Deployments → **Redeploy** the
   latest `main` commit (or Deploy latest). Wait for `Deploy successful`, then check logs for
   `migrationsRun: false` (no migration may run) and `Nest application successfully started`.
2. Service **TMS**: root directory `client/`, builder **Dockerfile**/static build (`npm run build` →
   `dist/`), same redeploy. The PWA service worker is regenerated with the new asset hashes.
3. Only if the dashboard offers no redeploy: `railway up --service API` and
   `railway up --service TMS` from a machine that is linked to the project (`railway link`), after
   `git switch main && git pull` on `4fc81e1`.
4. Verify: `GET /api/routing-public/deployment` must report the new commit hash; then open Planning,
   load trip `af3e9176-baca-4258-9a1b-bf6e15769854`, add ORD-2024007 and read the wizard.

## Next highest-priority task

Deploy, then call the consolidation preflight with `{ orderIds: ["7db8a596-f560-4ae5-ba49-091951c6ef77"] }`
(ORD-2024007) and confirm:

1. `route.addedDistanceKm << 2657` and `route.legs` differ from `route.baselineLegs` by insertion,
   not by tail append;
2. `insertion.recommended.stopOrder` matches the `route.stops` order, and each alternative preserves
   pickup-before-delivery;
3. the wizard renders that payload, the override reason is required for `unverified` (trailer
   `VL61TWZ` has no internal height) and confirmation stores `assignment_override` +
   `assignment_confirmation` rows;
4. re-sending the same `confirmationKey` returns the same trip with no second allocation — only on a
   controlled test trip, never on the production assignment.

Then continue with Priority 5 (`Conflicts: 1` explanation) and Priority 7 (the six Calculation
Results tabs and their exports), which are independent of the consolidation work.

## Remaining priorities (untouched)

- `Conflicts: 1` Planning chip explanation + jump-to-stop.
- Calculation Results six tabs + Excel/CSV/PDF exports.
- Currency-mixing regression guard (PLN/EUR tolls).
- Partial allocation, rejected cargo with photos, cargo ledger UI.
- Driver lifecycle transitions, mobile APK.
- Tachograph activity view and notifications.
- `provider_no_geometry` root cause and geometry persistence.
- Planning legend/raw status cleanup and Fleet deep-link verification.
- Website deployment identity.

## Rules that must survive this handover

- Never reset/seed/truncate production data; `migrationsRun: false` stays.
- Never fabricate dimensions, GPS, driver activity or route geometry; missing data is UNVERIFIED.
- Never soften a genuine blocker to a warning to make an assignment possible.
- One verdict, one source of truth: the frontend renders the backend `feasibility` verbatim.
- Seven locales: ro, en, nl, de, fr, es, pl. Orange `#FF5A00`. Chat and Website CMS preserved.
- Commit footer: `Generated with Codebuff 🤖` + `Co-Authored-By: Codebuff <noreply@codebuff.com>`.
