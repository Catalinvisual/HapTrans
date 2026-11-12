// Scenario modelling for the planning board.
//
// A scenario changes *when* a trip leaves and *which truck* pulls it. Both
// numbers that come out of here are estimates built from the truck's configured
// profile (cost/km, fixed cost/day, fuel consumption) — the same inputs the
// backend uses for its own estimate. Whenever an input is missing the figure is
// null instead of a confident zero, so the UI can print "—" and say why.

import { getTruckFuelProfile } from './truckFuel';

export interface ScenarioTruck {
  id?: string | null;
  plateNumber?: string | null;
  costPerKm?: any;
  fixedCostPerDay?: any;
  fuelConsumption?: any;
  fuelType?: any;
}

export interface ScenarioBaseline {
  departure: string | null;
  distanceKm: number | null;
  elapsedMin: number | null;
  toll: number | null;
  truck: ScenarioTruck | null;
}

export interface ScenarioInput {
  label: string;
  departure: string | null;
  truck: ScenarioTruck | null;
  includeFixedCost: boolean;
  driverName?: string | null;
}

export interface ScenarioEvaluation {
  label: string;
  truckId: string | null;
  plateNumber: string | null;
  driverName: string | null;
  departure: string | null;
  arrival: string | null;
  distanceKm: number | null;
  elapsedMin: number | null;
  variableCost: number | null;
  fixedCost: number | null;
  toll: number | null;
  totalCost: number | null;
  co2Kg: number | null;
  includeFixedCost: boolean;
}

export interface ScenarioDelta {
  departureMin: number | null;
  arrivalMin: number | null;
  distanceKm: number | null;
  cost: number | null;
  co2Kg: number | null;
}

const finite = (value: any): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const time = (value: any): number | null => {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

const round = (value: number, digits = 2): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

/** Days the truck is committed for, used for the fixed cost. */
export function scenarioDays(elapsedMin: number | null): number {
  if (elapsedMin === null || elapsedMin <= 0) return 1;
  return Math.max(1, Math.ceil(elapsedMin / 1440));
}

/** CO₂ for a distance on a given truck; null when any input is missing. */
export function scenarioCo2Kg(truck: ScenarioTruck | null, distanceKm: number | null): number | null {
  const consumption = finite(truck?.fuelConsumption);
  if (distanceKm === null || distanceKm <= 0) return null;
  if (consumption === null || consumption <= 0) return null;
  const profile = getTruckFuelProfile(truck?.fuelType);
  const factor = finite((profile as any)?.factorKgPerUnit);
  if (factor === null) return null;
  return round((distanceKm * consumption) / 100 * factor, 1);
}

export function evaluateScenario(baseline: ScenarioBaseline, scenario: ScenarioInput): ScenarioEvaluation {
  const departureMs = time(scenario.departure);
  const elapsedMin = baseline.elapsedMin;
  const arrivalMs = departureMs !== null && elapsedMin !== null ? departureMs + elapsedMin * 60000 : null;
  const distanceKm = baseline.distanceKm;

  const truck = scenario.truck || baseline.truck;
  const costPerKm = finite(truck?.costPerKm);
  const fixedPerDay = finite(truck?.fixedCostPerDay);
  const days = scenarioDays(elapsedMin);

  const variableCost = costPerKm !== null && distanceKm !== null ? round(costPerKm * distanceKm) : null;
  const fixedCost = scenario.includeFixedCost && fixedPerDay !== null ? round(fixedPerDay * days) : 0;
  const toll = baseline.toll;
  // A total built from a missing variable cost would look like a cheap trip.
  const totalCost = variableCost === null ? null : round(variableCost + fixedCost + (toll ?? 0));

  return {
    label: scenario.label,
    truckId: truck?.id ?? null,
    plateNumber: truck?.plateNumber ?? null,
    driverName: scenario.driverName ?? null,
    departure: departureMs === null ? null : new Date(departureMs).toISOString(),
    arrival: arrivalMs === null ? null : new Date(arrivalMs).toISOString(),
    distanceKm,
    elapsedMin,
    variableCost,
    fixedCost,
    toll,
    totalCost,
    co2Kg: scenarioCo2Kg(truck, distanceKm),
    includeFixedCost: scenario.includeFixedCost,
  };
}

/** Baseline evaluated with the same formulas, so the difference means something. */
export function evaluateBaseline(baseline: ScenarioBaseline): ScenarioEvaluation {
  return evaluateScenario(baseline, {
    label: 'baseline',
    departure: baseline.departure,
    truck: baseline.truck,
    includeFixedCost: true,
    driverName: null,
  });
}

export function scenarioDelta(base: ScenarioEvaluation, next: ScenarioEvaluation): ScenarioDelta {
  const baseDeparture = time(base.departure);
  const nextDeparture = time(next.departure);
  const baseArrival = time(base.arrival);
  const nextArrival = time(next.arrival);
  return {
    departureMin:
      baseDeparture === null || nextDeparture === null
        ? null
        : Math.round((nextDeparture - baseDeparture) / 60000),
    arrivalMin:
      baseArrival === null || nextArrival === null
        ? null
        : Math.round((nextArrival - baseArrival) / 60000),
    distanceKm:
      base.distanceKm === null || next.distanceKm === null
        ? null
        : round(next.distanceKm - base.distanceKm, 1),
    cost: base.totalCost === null || next.totalCost === null ? null : round(next.totalCost - base.totalCost),
    co2Kg: base.co2Kg === null || next.co2Kg === null ? null : round(next.co2Kg - base.co2Kg, 1),
  };
}

export interface ScenarioWindowCheck {
  checked: number;
  violations: number;
}

/**
 * How many customer windows the new departure would miss. Arrival times come
 * from the stop ETAs (or planned dates); windows themselves never move.
 */
export function scenarioWindowCheck(stops: any[], departureShiftMin: number | null): ScenarioWindowCheck {
  if (departureShiftMin === null) return { checked: 0, violations: 0 };
  let checked = 0;
  let violations = 0;
  for (const stop of stops || []) {
    const arrival = time(stop?.eta) ?? time(stop?.plannedDate);
    if (arrival === null) continue;
    const shifted = arrival + departureShiftMin * 60000;
    const from = time(stop?.timeWindowMin);
    const to = time(stop?.timeWindowMax);
    if (from === null && to === null) continue;
    checked += 1;
    if ((from !== null && shifted < from) || (to !== null && shifted > to)) violations += 1;
  }
  return { checked, violations };
}

/** ISO string for a `datetime-local` input, in the dispatcher's own timezone. */
export function toLocalInputValue(value: any): string {
  const ms = time(value);
  if (ms === null) return '';
  const date = new Date(ms - new Date(ms).getTimezoneOffset() * 60000);
  return date.toISOString().slice(0, 16);
}

/** Inverse of {@link toLocalInputValue}. */
export function fromLocalInputValue(value: string): string | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

/** Move an ISO instant by whole minutes; used by the quick "shift" buttons. */
export function shiftIsoMinutes(value: any, minutes: number): string | null {
  const ms = time(value);
  if (ms === null) return null;
  return new Date(ms + minutes * 60000).toISOString();
}
