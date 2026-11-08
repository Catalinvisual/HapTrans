# HapCargo — agent handover

Last updated with the commit `fix(planning): find the best consolidation insertion and wire the wizard`
(previous HEAD: `2940881`).

## Git

- Work on `main` only. No branches.
- History of this slice: `2940881` (append-cost diagnosis) → this commit (insertion search + wizard).
- Working tree keeps the untracked `planning-*.png` verification screenshots; they are user files and must stay.

## What this commit changes

### 1. Smart Consolidation now searches insertion positions (the 2,657 km defect)

The defect was **not** HERE/ORS routing and **not** `incrementalRoute()`: `preflightConsolidation`
appended the candidate order to the tail of the existing itinerary (Berlin → Eindhoven 654 km +
Eindhoven → Brașov 2,003 km = 2,657 km) and presented that append cost as `addedKm`.

- New `server/src/planning/consolidation-proposal.ts` (`buildConsolidationProposal`) assembles the
  proposal: it delegates to the existing `evaluateInsertion` position search
  (`server/src/planning/stop-insertion.ts`), so **every** pickup/delivery position pair is evaluated
  against pickup-before-delivery, per-order dependencies, cargo on board, capacity, time windows and
  driver time. The cheapest **feasible** position wins — not the first or last one.
- `preflightConsolidation` (`planning.service.ts`) now builds the proposal first and derives the
  cargo ledger, per-leg route and stop sequence from the **chosen** sequence. `consolidationCapacity`
  was split so `consolidationCapacityForSequence()` accepts an already-decided sequence
  (`consolidation-cargo.ts`, `prepareLedgerStops()` exported).
- Road legs are resolved once per stop pair by the new private `resolveLegResolver()` and shared by
  the insertion search and `routeForStops()`, so the proposal and the totals cannot disagree, and no
  leg is routed twice.
- Multi-day driving is modelled (`stop-insertion.ts`): 9 h driving per duty day, 45 min break after
  4.5 h continuous driving, 11 h daily rest. A long international trip is therefore no longer
  reported as a shift violation; `driverHours.methodology = 'eu_561_2006_planning_model'` and the
  preflight still reports tachograph-based availability as `unverified`.
- Pre-existing window misses (already missed before the insertion) are reported as
  `PRE_EXISTING_WINDOW_MISS` warnings, so they cannot reject every insertion position. A position
  that pushes an existing delivery past a *met* window is still a hard `STOP_WINDOW_MISSED` blocker.
- The preflight response now also returns `insertion` (recommended + alternatives with their own
  `addedDistanceKm`/`stopOrder`), `schedule`, `equipment` (truck/trailer fields with
  compatible/incompatible/unverified per requirement) and `driverHours.scheduleModel`.
- Blockers/warnings are deduplicated by code + order + stop + field before the verdict, so one
  overload is never counted twice.
- Missing placement (`infeasible`/`unverified`) returns `route.status = 'unverified'`, `null`
  proposed/added distance and an empty leg list — never a baseline figure relabelled as a proposal.

### 2. Smart Consolidation wizard

`client/src/components/ConsolidationWizard.tsx` replaces the inline modal in `PlanningPage.tsx`
(lines 4360–4641 of that file were replaced by one component call). It renders, exclusively from the
backend payload:

- canonical verdict header (`feasibility.status`, hard blockers, warnings, unverified counts, codes);
- selectable recommended/alternative insertion sequences with per-stop number, type, order, city,
  arrival, departure, ETA delta, window status and new/existing marker;
- route provenance: baseline/proposed/added distance and driving time, provider, verified status;
- schedule: waiting, breaks, daily rest, duty days + explicit "not tachograph" note;
- cargo before/after and per-dimension usage against the recorded limits (`—` when a limit is null);
- truck/trailer identity and dimensions with Fleet deep-link, plus per-requirement equipment verdicts;
- driver-hours block that shows `unverified` instead of inventing availability;
- every conflict with level, code, message, raw params and jump-to-order action;
- a required override reason when the verdict is `warning`/`unverified`, with the backend error shown
  inline; confirm is disabled until the reason is non-empty and the verdict is not `blocked`.

`PlanningPage` no longer calls `insertion-preview` separately: the preflight already evaluates every
position, so there is one source of truth and one routing round-trip fewer.

### 3. Audited override and safe confirmation (`assignOrders`)

- `BLOCKED` can never be overridden; the verdict and `overrideable` are recomputed server-side.
- A soft outcome requires `override.reason` (non-empty) **and** acknowledgement of every current soft
  code; otherwise `OVERRIDE_REQUIRED` / `OVERRIDE_CODES_MISMATCH` / `OVERRIDE_NOT_ALLOWED` is
  returned with the codes and verdict.
- The audit record is stored in the existing `planning_actions` table (`action = 'assignment_override'`,
  `beforeState` = verdict + codes, `afterState` = reason, accepted codes, trip/order/truck/trailer,
  `decidedBy` from the JWT, `decidedAt`). **No schema change, no migration.** If the audit row cannot
  be written the assignment is refused (`OVERRIDE_AUDIT_FAILED`).
- `dto.preview` (verdict + added distance + reviewed sequence) is compared with the revalidated
  proposal. A changed verdict, a distance drift > 0.5 km or an unknown stop set returns
  `PROPOSAL_CHANGED` with the fresh preflight; the wizard then re-renders it and requires another
  confirmation. Confirming the recommended sequence, an alternative, or a permutation of the same
  stops is accepted.
- The confirmed `stopOrder` is validated for pickup-before-delivery (`STOP_ORDER_INVALID`).

## Verified in this slice

- `cd server && npx tsc --noEmit` → **0**
- `cd server && npx jest src/planning` → **15 suites / 106 tests pass**
- `cd client && npx tsc --noEmit` → **0**
- `cd client && npm run build` → **0** (PWA generated, 101 precache entries)
- New regression suite `server/src/planning/consolidation-proposal.spec.ts` (14 tests) pins the exact
  production scenario: baseline 2,152 km, the 1,673 km corridor insertion (Écully → Eindhoven → Soest
  → Pobiedziska → Berlin → Brașov) is chosen, the 2,657 km tail append is **not**; plus window
  precedence (a longer position wins when the shorter one breaks a window), pre-existing misses,
  capacity infeasibility, missing provider leg, multi-day duty days, multiple orders and
  pickup-before-delivery.

## Not yet verified / not done

- **No deployment**: this environment has no Railway CLI or token. `server/` and `client/` must be
  redeployed from the Railway dashboard (Dockerfile builder) before the production TMS serves this.
  Production still reports `9ccc196` for the API at the time of writing.
- The new wizard has not been exercised in a browser against production data in this session
  (`tsc` + `vite build` only). Its data contract is the preflight payload listed above.
- Truck/trailer **overlap re-check** is still not part of `preflightConsolidation`; the genuine
  423-minute overlap for `AR 67X WT` / `TRP-2026-0005` is produced by the availability checks
  elsewhere and must stay a hard blocker.
- `Conflicts: 1` Planning chip explanation + jump-to-stop (Priority 5) — untouched.
- Calculation Results six tabs + Excel/CSV/PDF exports (Priority 7) — untouched.
- Currency-mixing regression guard (PLN/EUR tolls) — untouched.
- Partial allocation, rejected cargo with photos, cargo ledger UI (Priority 8) — untouched.
- Driver lifecycle transitions, mobile APK (Priority 9) — untouched.
- Tachograph activity view and notifications (Priorities 10–11) — untouched.
- `provider_no_geometry` root cause and geometry persistence (Priority 6) — untouched.
- Planning legend/raw status cleanup and Fleet deep-link verification (Priority 12) — untouched.
- Website deployment identity (Priority 13) — untouched.

## Next highest-priority task

Deploy this commit, then call
`POST /api/planning/trips/af3e9176-baca-4258-9a1b-bf6e15769854/consolidation-preflight`
with `{ orderIds: ["7db8a596-f560-4ae5-ba49-091951c6ef77"] }` and confirm:

1. `route.addedDistanceKm << 2657` and `route.legs` differ from `route.baselineLegs` by insertion,
   not by tail append;
2. `insertion.recommended.stopOrder` matches `route.stops` order;
3. the wizard renders that payload and confirmation stores an `assignment_override` row when the
   verdict is `unverified` (trailer `VL61TWZ` has no internal height).

Then continue with Priority 5 (`Conflicts: 1` explanation) and Priority 7 (Calculation Results tabs),
which are independent of the consolidation work.

## Rules that must survive this handover

- Never reset/seed/truncate production data; `migrationsRun: false` stays.
- Never fabricate dimensions, GPS, driver activity or route geometry; missing data is UNVERIFIED.
- Never soften a genuine blocker to a warning to make an assignment possible.
- One verdict, one source of truth: the frontend renders the backend `feasibility` verbatim.
- Seven locales: ro, en, nl, de, fr, es, pl. Orange `#FF5A00`. Chat and Website CMS preserved.
- Commit footer: `Generated with Codebuff 🤖` + `Co-Authored-By: Codebuff <noreply@codebuff.com>`.
