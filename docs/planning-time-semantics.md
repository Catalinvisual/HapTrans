# Planning time semantics, truck occupancy and conflict codes

This document describes the model that the planning board, order form, trip
page and route planner share. It exists because the same two bugs kept coming
back:

- a single entered pickup/delivery time became a next-day window, and
- a truck looked booked for every day between first pickup and last delivery.

## 1. Stop appointments

Order stops keep the local wall clock in two columns: `dateFrom` (`YYYY-MM-DD`)
and `timeFrom` (`HH:mm`), plus the optional `dateTo` / `timeUntil` for a
flexible window. `server/src/planning/stop-appointment.ts` is the only place
that turns those columns into an instant.

| Entered | Kind | Behaviour |
| --- | --- | --- |
| one endpoint (Min only or Max only) | `fixed` | exact appointment; start === end; no synthetic second endpoint |
| both endpoints | `window` | the exact entered interval, unchanged |
| none | `unscheduled` | no window, no ETA deadline, no `00:00–23:59` |
| Max earlier than Min | `invalid` | rejected with `STOP_WINDOW_INVALID`; values are never swapped |

A date-only maximum keeps `23:59` as the end of that day and is reported with
`STOP_WINDOW_END_TIME_ASSUMED`.

Every consumer (planning service, stop insertion, consolidation, loading
window, planning engine, orders validation) delegates to this module. No caller
may build `new Date(`${date}T${time}`)`.

## 2. Time zone

- The operational zone is `OPERATIONAL_TIMEZONE`, defaulting to
  `Europe/Bucharest` (the company default in `Company.timezone`).
- Wall clock → UTC happens exactly once, in `server/src/common/operational-time.ts`
  (`wallClockToInstant`), with one DST re-check. Trip stops store UTC instants.
- Display converts back in the same zone (`OPERATIONAL_TIME_ZONE` on the client),
  never through the browser zone, so 08:00 entered stays 08:00 on every screen.
- Unit tests cover winter, summer and both DST boundaries, plus a non-existent
  wall clock (02:30 on the spring-forward day).

## 3. Truck occupancy and availability

Occupancy comes from the trip's persisted schedule: `optimizationMetadata.scheduleTimeline`
first, then stop `eta` estimates. It is never derived from a broad
`plannedDeparture`/`plannedArrival` calendar range or from order windows.

- Driving legs and service at stops are **committed**.
- Gaps longer than 240 min are **layovers**: the truck is parked, so it is free.
- Cross-trip comparison uses the **trip span**: `plannedDeparture` to the last
  committed interval end. The planned arrival never extends it.
- A trip with no schedule at all falls back to its planned span and is flagged
  `verified: false`, so the UI reports `TRUCK_AVAILABILITY_UNVERIFIED` instead of
  claiming the truck is free.
- Two consecutive trips are valid when the gap is at least
  `DEFAULT_TURNAROUND_MIN` (45 min) and repositioning is known to fit.
- A full trip blocks cargo insertion into that trip only
  (`CAPACITY_*`), never the truck for the whole calendar range.

## 4. Conflict codes

| Code | Meaning |
| --- | --- |
| `TRUCK_OVERLAP` | committed intervals of two trips on one truck intersect; params carry conflicting trip, exact start/end, minutes, stop and resolution |
| `TRUCK_TURNAROUND_INSUFFICIENT` | trips do not overlap but the gap is below the turnaround minimum |
| `TRUCK_AVAILABILITY_UNVERIFIED` | no verifiable schedule, or a planned-span fallback; confirmation required |
| `TRAILER_OVERLAP` | the same trailer is committed to two trips for overlapping spans |
| `DRIVER_OVERLAP` | the same driver is on two overlapping trips |
| `CAPACITY_WEIGHT` / `CAPACITY_*` | cargo exceeds the trip; never reported as truck availability |

## 5. Legacy records

Rows written before this change may hold a synthesised endpoint (a `23:59`
maximum, or an end one day after the start) and trips whose timeline still
covers long layovers. The compatibility strategy is read-side:

- Fixed appointments are detected by `start === end`; a stored `23:59` maximum
  is displayed as a window, matching what the record actually contains.
- No historical row is rewritten by a migration. Editing and saving an order
  rewrites its stops through `assertStopAppointments`, so a corrected save
  produces the exact semantics above.
- Trip occupancy is recomputed from the current schedule on every planning read,
  so a recalculated trip immediately stops reserving the truck for its layovers.
