// Pure data-shaping helpers for the Planning Calculation Results panel.
// Kept free of React/DOM/Vite imports so the calculations can be unit-tested.

import { humanName } from './driverName';
import { FUEL_FACTORS, getTruckFuelProfile } from './truckFuel';
import { operationalStatusForDisplay } from './operationalI18n';

export { FUEL_FACTORS };

export type CostBasis = 'recorded' | 'estimated' | 'mixed' | 'none';
export type TimeBasis = 'recorded' | 'estimated' | 'none';
export type AssignmentSource = 'assigned' | 'truck' | 'carrier' | 'none';

export function toNum(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function toMs(value: any): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function minutesBetween(a: any, b: any): number | null {
  const am = toMs(a);
  const bm = toMs(b);
  if (am === null || bm === null) return null;
  return Math.round((bm - am) / 60000);
}

export function nameOfDriver(driver: any): string {
  if (!driver) return '';
  if (driver.firstName) return `${driver.firstName} ${driver.lastName || ''}`.trim();
  const raw = String(driver.user?.name || driver.name || '').trim();
  if (!raw) return '';
  const readable = raw.includes('@') ? humanName(raw) : raw;
  return readable === '—' ? '' : readable;
}

export function sumCargo(orders: any[]) {
  let weight = 0;
  let ldm = 0;
  let hasLdm = false;
  let pallets = 0;
  let volume = 0;
  for (const order of orders || []) {
    if (Array.isArray(order?.cargoItems) && order.cargoItems.length > 0) {
      for (const item of order.cargoItems) {
        weight += Number(item.weightKg) || 0;
        const itemLdm = toNum(item.ldm);
        if (itemLdm !== null && itemLdm > 0) {
          ldm += itemLdm;
          hasLdm = true;
        }
        volume += Number(item.volumeCbm) || 0;
        pallets += Number(item.quantity) || 0;
      }
    } else {
      weight += Number(order?.weightKg || order?.totalWeightKg) || 0;
      pallets += Number(order?.pallets || order?.totalPallets) || 0;
      volume += Number(order?.volumeCbm || order?.totalVolumeCbm) || 0;
      const orderLdm = toNum(order?.loadingMeters);
      if (orderLdm !== null && orderLdm > 0) {
        ldm += orderLdm;
        hasLdm = true;
      }
    }
  }
  return { weight, ldm, hasLdm, pallets, volume };
}

export function costBucket(cost: any): 'fuel' | 'toll' | 'driver' | 'other' {
  const raw = `${cost?.category || ''} ${cost?.type || ''}`.toLowerCase();
  if (/fuel|combustibil|carburant|brandstof|kraftstoff|paliwo/.test(raw)) return 'fuel';
  if (/toll|tax|peaj|péage|maut|opłat/.test(raw)) return 'toll';
  if (/salary|salar|wage|driver|chauffeur|fahrer|kierow/.test(raw)) return 'driver';
  return 'other';
}

function resolvedDriver(trip: any): { entity: any | null; source: AssignmentSource; name: string } {
  const assignment = trip?.assignment;
  const source: AssignmentSource =
    assignment?.driverSource ||
    (trip?.driver?.id ? 'assigned' : trip?.truck?.driver?.id ? 'truck' : trip?.carrierDriverName ? 'carrier' : 'none');
  const entity = trip?.driver || trip?.truck?.driver || null;
  const rawAssignmentName = String(assignment?.driverName || '').trim();
  const name =
    nameOfDriver(entity) ||
    (rawAssignmentName
      ? rawAssignmentName.includes('@')
        ? humanName(rawAssignmentName)
        : rawAssignmentName
      : '') ||
    String(trip?.carrierDriverName || '').trim();
  return { entity, source, name };
}

function resolvedTrailer(trip: any): { entity: any | null; source: AssignmentSource; plate: string } {
  const assignment = trip?.assignment;
  const source: AssignmentSource =
    assignment?.trailerSource ||
    (trip?.trailer?.id ? 'assigned' : trip?.truck?.trailer?.id ? 'truck' : trip?.carrierTrailerPlate ? 'carrier' : 'none');
  const plate =
    assignment?.trailerPlate ||
    trip?.trailer?.plateNumber ||
    trip?.trailerPlate ||
    trip?.carrierTrailerPlate ||
    trip?.truck?.trailer?.plateNumber ||
    '';
  return { entity: trip?.trailer || trip?.truck?.trailer || null, source, plate };
}

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

function firstPositive(...values: any[]): number | null {
  for (const value of values) {
    const numeric = toNum(value);
    if (numeric !== null && numeric > 0) return numeric;
  }
  return null;
}

export function buildTripMetrics(trip: any) {
  const orders = trip?.orders || [];
  const costs = trip?.costs || [];
  const truck = trip?.truck || null;
  const routePlan = trip?.routePlan || null;
  const driverAssignment = resolvedDriver(trip);
  const trailerAssignment = resolvedTrailer(trip);

  const truckPlate = truck?.plateNumber || trip?.carrierTruckPlate || '';

  const priceValues: number[] = [];
  for (const order of orders) {
    const price = toNum(order?.price);
    if (price !== null) priceValues.push(price);
  }
  const revenue = priceValues.length > 0 ? priceValues.reduce((a, b) => a + b, 0) : null;
  const currency = orders.find((order: any) => order?.currency)?.currency || 'EUR';

  const buckets = { fuel: 0, toll: 0, driver: 0, other: 0 };
  const present = { fuel: false, toll: false, driver: false, other: false };
  for (const cost of costs) {
    const amount = toNum(cost?.amount);
    if (amount === null) continue;
    const bucket = costBucket(cost);
    buckets[bucket] += amount;
    present[bucket] = true;
  }
  const recordedTotal =
    present.fuel || present.toll || present.driver || present.other
      ? buckets.fuel + buckets.toll + buckets.driver + buckets.other
      : null;
  const estimatedCost = toNum(trip?.estimatedCost);
  const estimatedProfit = toNum(trip?.estimatedProfit);

  const rawBreakdown = trip?.estimatedCostBreakdown;
  const estimatedBreakdown =
    rawBreakdown && typeof rawBreakdown === 'object'
      ? {
          fuel: rawBreakdown.fuelCostAvailable === false ? null : toNum(rawBreakdown.fuelCost),
          fuelCostAvailable: rawBreakdown.fuelCostAvailable !== false,
          toll: rawBreakdown.tollCostAvailable === false ? null : toNum(rawBreakdown.tollCost),
          tollCostAvailable: rawBreakdown.tollCostAvailable !== false,
          driver: toNum(rawBreakdown.driverCost),
          maintenance: toNum(rawBreakdown.maintenanceCost),
          fixed: toNum(rawBreakdown.fixedCost),
          manual: toNum(rawBreakdown.manualCost),
          total: toNum(rawBreakdown.total),
          driverCostSource: rawBreakdown.driverCostSource || null,
          driverDistanceKm: toNum(rawBreakdown.driverDistanceKm),
          driverPayMode: rawBreakdown.driverPayMode || null,
          driverPayRate: toNum(rawBreakdown.driverPayRate),
          estimatedFields: Array.isArray(rawBreakdown.estimatedFields) ? rawBreakdown.estimatedFields : [],
        }
      : null;

  const recordedFuel = present.fuel ? buckets.fuel : null;
  const recordedToll = present.toll ? buckets.toll : null;
  const recordedDriver = present.driver ? buckets.driver : null;
  const recordedOther = present.other ? buckets.other : null;

  const tollStatus = String(trip?.tollStatus || '').toLowerCase();
  const tollDisabled = ['not_calculated', 'unavailable', 'failed', 'error'].includes(tollStatus);
  const routingToll = tollDisabled ? null : toNum(trip?.tollCost);
  // A CostEngine breakdown contains tollCost=0 when HERE did not return a
  // toll. Do not turn that into a verified €0 toll.
  const estimatedToll =
    tollDisabled || estimatedBreakdown?.tollCostAvailable === false || !estimatedBreakdown?.toll || estimatedBreakdown.toll <= 0
      ? null
      : estimatedBreakdown.toll;
  const estimatedDriver =
    estimatedBreakdown && estimatedBreakdown.driverCostSource !== 'unavailable'
      ? estimatedBreakdown.driver
      : null;

  const pick = (recorded: number | null, estimated: number | null): { value: number | null; basis: CostBasis } =>
    recorded !== null
      ? { value: recorded, basis: 'recorded' }
      : estimated !== null
        ? { value: estimated, basis: 'estimated' }
        : { value: null, basis: 'none' };

  const fuelComp = pick(recordedFuel, estimatedBreakdown?.fuel ?? null);
  const tollComp = pick(recordedToll, routingToll ?? estimatedToll);
  const driverComp = pick(recordedDriver, estimatedDriver);

  // Other costs includes maintenance and fixed ownership costs from the
  // CostEngine. Manual TripCosts are already represented by the recorded
  // buckets, so only use the estimated manual amount when no recorded costs
  // were loaded at all (avoids double counting).
  const estimatedStructuralOther =
    estimatedBreakdown ? (estimatedBreakdown.maintenance ?? 0) + (estimatedBreakdown.fixed ?? 0) : null;
  const estimatedManual = recordedTotal === null ? estimatedBreakdown?.manual ?? null : null;
  const otherValue =
    recordedOther !== null || estimatedBreakdown
      ? (recordedOther ?? 0) + (estimatedStructuralOther ?? 0) + (estimatedManual ?? 0)
      : null;
  const otherComp: { value: number | null; basis: CostBasis } = {
    value: otherValue,
    basis:
      recordedOther !== null
        ? (estimatedStructuralOther ?? 0) > 0
          ? 'mixed'
          : 'recorded'
        : estimatedBreakdown
          ? 'estimated'
          : 'none',
  };

  const componentBases = [fuelComp.basis, tollComp.basis, driverComp.basis, otherComp.basis];
  const meaningfulBases = componentBases.filter((basis) => basis !== 'none');
  let costBasis: CostBasis = 'none';
  let totalCost: number | null = null;
  if (estimatedBreakdown) {
    totalCost = money(
      (fuelComp.value ?? 0) +
        (tollComp.value ?? 0) +
        (driverComp.value ?? 0) +
        (otherComp.value ?? 0),
    );
    costBasis = meaningfulBases.includes('mixed') ||
      (meaningfulBases.includes('recorded') && meaningfulBases.includes('estimated'))
      ? 'mixed'
      : meaningfulBases.length > 0 && meaningfulBases.every((basis) => basis === 'recorded')
        ? 'recorded'
        : meaningfulBases.length > 0
          ? 'estimated'
          : 'none';
  } else if (recordedTotal !== null) {
    totalCost = recordedTotal;
    costBasis = 'recorded';
  } else if (estimatedCost !== null) {
    totalCost = estimatedCost;
    costBasis = 'estimated';
  }
  // A missing toll estimate makes total cost and profit incomplete. Do not
  // present a profit that silently excludes an unavailable toll.
  const tollMissing =
    recordedToll === null &&
    (tollDisabled || (estimatedBreakdown !== null && estimatedBreakdown.tollCostAvailable === false));
  const profit = revenue !== null && totalCost !== null && !tollMissing
    ? money(revenue - totalCost)
    : (tollMissing ? null : estimatedProfit);

  const stops = (trip?.stops || []).slice().sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));

  const departure = trip?.actualDeparture || trip?.plannedDeparture || null;
  const arrival = trip?.actualArrival || trip?.plannedArrival || null;
  const plannedElapsedMin = minutesBetween(trip?.plannedDeparture, trip?.plannedArrival);
  const actualElapsedMin = minutesBetween(trip?.actualDeparture, trip?.actualArrival);
  const elapsedMin = actualElapsedMin ?? plannedElapsedMin;
  const elapsedBasis: 'actual' | 'planned' | 'none' =
    actualElapsedMin !== null ? 'actual' : plannedElapsedMin !== null ? 'planned' : 'none';

  let waitingSum = 0;
  let loadingSum = 0;
  let unloadingSum = 0;
  let waitingKnown = true;
  let loadingKnown = true;
  let unloadingKnown = true;

  for (const stop of stops) {
    const ata = toMs(stop?.ata);
    const eta = toMs(stop?.eta);
    const done = toMs(stop?.completedAt);

    if (ata !== null && eta !== null) waitingSum += Math.max(0, Math.round((ata - eta) / 60000));
    else waitingKnown = false;

    const tasks = stop?.tasks || [];
    const type = String(stop?.type || '').toLowerCase();
    const hasLoad =
      tasks.some((task: any) => String(task?.type || '').toLowerCase() === 'load') || type === 'pickup';
    const hasUnload =
      tasks.some((task: any) => String(task?.type || '').toLowerCase() === 'unload') || type === 'delivery';
    const service = ata !== null && done !== null ? Math.max(0, Math.round((done - ata) / 60000)) : null;

    if (service === null) {
      if (hasLoad) loadingKnown = false;
      if (hasUnload) unloadingKnown = false;
    } else if (hasLoad && hasUnload) {
      loadingKnown = false;
      unloadingKnown = false;
    } else if (hasLoad) {
      loadingSum += service;
    } else if (hasUnload) {
      unloadingSum += service;
    }
  }

  const noStops = stops.length === 0;
  let waitingMin = noStops ? 0 : waitingKnown ? waitingSum : null;
  let waitingBasis: TimeBasis = noStops ? 'none' : waitingKnown ? 'recorded' : 'none';
  if (!noStops && waitingMin === null) {
    const plannedWaiting = toNum(routePlan?.totalWaitingTimeMinutes);
    if (plannedWaiting !== null) {
      waitingMin = plannedWaiting;
      waitingBasis = 'estimated';
    }
  }

  const routeStops = Array.isArray(routePlan?.stops) ? routePlan.stops : [];
  const plannedService = (types: string[]): number | null => {
    const matching = routeStops.filter((stop: any) =>
      types.includes(String(stop?.type || '').toLowerCase()),
    );
    if (matching.length === 0) return null;
    return matching.reduce((sum: number, stop: any) => sum + (Number(stop.serviceDurationMinutes) || 0), 0);
  };

  let loadingMin = noStops ? 0 : loadingKnown ? loadingSum : null;
  let loadingBasis: TimeBasis = noStops ? 'none' : loadingKnown ? 'recorded' : 'none';
  if (!noStops && loadingMin === null) {
    const plannedLoading = plannedService(['pickup', 'load']);
    if (plannedLoading !== null) {
      loadingMin = plannedLoading;
      loadingBasis = 'estimated';
    }
  }

  let unloadingMin = noStops ? 0 : unloadingKnown ? unloadingSum : null;
  let unloadingBasis: TimeBasis = noStops ? 'none' : unloadingKnown ? 'recorded' : 'none';
  if (!noStops && unloadingMin === null) {
    const plannedUnloading = plannedService(['delivery', 'unload']);
    if (plannedUnloading !== null) {
      unloadingMin = plannedUnloading;
      unloadingBasis = 'estimated';
    }
  }

  // Driving time is never inferred from elapsed time. Prefer recorded
  // tachograph values, then the route plan's authoritative HERE/ORS duration.
  // A persisted zero means no usable record, not a zero-length drive.
  const recordedDriving = firstPositive(
    trip?.actualDrivingMin,
    trip?.drivingTimeMin,
    trip?.recordedDrivingMin,
  );
  const routeDrivingMin = firstPositive(routePlan?.totalDrivingTimeMinutes);
  const drivingMin = recordedDriving ?? routeDrivingMin;
  const drivingBasis: TimeBasis = recordedDriving !== null ? 'recorded' : routeDrivingMin !== null ? 'estimated' : 'none';

  const cargo = sumCargo(orders);
  const capacityWeight = toNum(truck?.maxWeightKg) ?? toNum(truck?.payloadCapacity);
  const capacityLdm = toNum(truck?.maxLdm);
  const weightPct =
    capacityWeight && capacityWeight > 0 && cargo.weight > 0
      ? (cargo.weight / capacityWeight) * 100
      : null;
  const ldmPct =
    capacityLdm && capacityLdm > 0 && cargo.hasLdm ? (cargo.ldm / capacityLdm) * 100 : null;
  const utilizationPct =
    weightPct === null && ldmPct === null ? null : Math.max(weightPct ?? 0, ldmPct ?? 0);

  const consumption = toNum(truck?.fuelConsumption);
  const distanceKm = toNum(trip?.distanceKm);
  const fuelProfile = getTruckFuelProfile(truck?.fuelType);
  const fuelType = fuelProfile?.code ?? null;
  const fuelTypeRaw = fuelProfile?.code ?? '';
  const fuelTypeLabelKey = fuelProfile?.labelKey ?? null;
  const consumptionUnit = fuelProfile?.unit ?? null;
  const isElectric = fuelType === 'ELECTRIC';
  const emissionFactor = fuelProfile?.factorKgPerUnit ?? null;
  // Energy quantity uses the unit defined by the canonical fuel type. It is
  // never aggregated across different units and never assumes Diesel.
  const energyQuantity =
    consumptionUnit && distanceKm !== null && distanceKm > 0 && consumption !== null && consumption > 0
      ? (distanceKm * consumption) / 100
      : null;
  const fuelLiters = consumptionUnit === 'L/100 km' ? energyQuantity : null;
  const co2Kg = energyQuantity !== null && emissionFactor !== null ? energyQuantity * emissionFactor : null;

  let emissionMissing: 'fuel_type' | 'unit' | 'consumption' | 'distance' | 'factor' | null = null;
  if (!fuelType || !fuelProfile) emissionMissing = 'fuel_type';
  else if (!consumptionUnit) emissionMissing = 'unit';
  else if (consumption === null || consumption <= 0) emissionMissing = 'consumption';
  else if (distanceKm === null || distanceKm <= 0) emissionMissing = 'distance';
  else if (emissionFactor === null) emissionMissing = 'factor';

  return {
    id: String(trip?.id || ''),
    raw: trip,
    tripNumber: trip?.tripNumber || '',
    status: operationalStatusForDisplay(trip),
    truckId: truck?.id || '',
    driverId: driverAssignment.entity?.id || '',
    truckPlate,
    trailerPlate: trailerAssignment.plate,
    trailerSource: trailerAssignment.source,
    driverName: driverAssignment.name,
    driverSource: driverAssignment.source,
    driverEntity: driverAssignment.entity,
    distanceKm,
    emptyKm:
      toNum(trip?.emptyKm) ??
      toNum(trip?.deadheadKm) ??
      toNum(trip?.emptyKilometers) ??
      toNum(routePlan?.emptyKilometers),
    elapsedMin,
    elapsedBasis,
    plannedElapsedMin,
    actualElapsedMin,
    travelMin: elapsedMin,
    drivingMin,
    drivingBasis,
    waitingMin,
    waitingBasis,
    loadingMin,
    loadingBasis,
    unloadingMin,
    unloadingBasis,
    departure,
    arrival,
    toll: tollComp.value,
    fuelCost: fuelComp.value,
    driverCost: driverComp.value,
    otherCost: otherComp.value,
    componentBasis: {
      fuel: fuelComp.basis,
      toll: tollComp.basis,
      driver: driverComp.basis,
      other: otherComp.basis,
    },
    driverCostSource: estimatedBreakdown?.driverCostSource ?? null,
    driverDistanceKm: estimatedBreakdown?.driverDistanceKm ?? null,
    driverPayMode: estimatedBreakdown?.driverPayMode ?? null,
    driverPayRate: estimatedBreakdown?.driverPayRate ?? null,
    recordedTotal,
    estimatedCost,
    estimatedBreakdown,
    estimatedCalculatedAt: trip?.costCalculatedAt || (estimatedBreakdown ? trip?.updatedAt : null),
    totalCost,
    costBasis,
    revenue,
    profit,
    utilizationPct,
    currency,
    fuelType,
    fuelTypeRaw,
    fuelTypeLabelKey,
    isElectric,
    consumption,
    consumptionUnit,
    emissionFactor,
    emissionReason: fuelProfile?.factorReason ?? null,
    energyQuantity,
    fuelLiters,
    co2Kg,
    emissionMissing,
    stops,
    costs,
    routePlan,
  };
}

export type TripMetrics = ReturnType<typeof buildTripMetrics>;
