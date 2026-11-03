// Pure data-shaping helpers for the Planning Calculation Results panel.
// Kept free of React/DOM/Vite imports so the calculations can be unit-tested.

import { humanName } from './driverName';

export const FUEL_FACTORS: Record<string, number> = {
  diesel: 2.68,
  petrol: 2.31,
  gasoline: 2.31,
  lpg: 1.63,
  lng: 2.75,
  cng: 2.75,
  hybrid: 2.68,
};

export type CostBasis = 'recorded' | 'estimated' | 'none';
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
  const source: AssignmentSource = assignment?.driverSource || (trip?.driver?.id ? 'assigned' : trip?.truck?.driver?.id ? 'truck' : trip?.carrierDriverName ? 'carrier' : 'none');
  const entity = trip?.driver || trip?.truck?.driver || null;
  const name = assignment?.driverName || nameOfDriver(entity) || String(trip?.carrierDriverName || '').trim();
  return { entity, source, name };
}

function resolvedTrailer(trip: any): { entity: any | null; source: AssignmentSource; plate: string } {
  const assignment = trip?.assignment;
  const source: AssignmentSource = assignment?.trailerSource || (trip?.trailer?.id ? 'assigned' : trip?.truck?.trailer?.id ? 'truck' : trip?.carrierTrailerPlate ? 'carrier' : 'none');
  const plate =
    assignment?.trailerPlate ||
    trip?.trailer?.plateNumber ||
    trip?.trailerPlate ||
    trip?.carrierTrailerPlate ||
    trip?.truck?.trailer?.plateNumber ||
    '';
  return { entity: trip?.trailer || trip?.truck?.trailer || null, source, plate };
}

export function buildTripMetrics(trip: any) {
  const orders = trip?.orders || [];
  const costs = trip?.costs || [];
  const truck = trip?.truck || null;
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
          fuel: toNum(rawBreakdown.fuelCost),
          toll: toNum(rawBreakdown.tollCost),
          driver: toNum(rawBreakdown.driverCost),
          maintenance: toNum(rawBreakdown.maintenanceCost),
          fixed: toNum(rawBreakdown.fixedCost),
          manual: toNum(rawBreakdown.manualCost),
          total: toNum(rawBreakdown.total),
          driverCostSource: rawBreakdown.driverCostSource || null,
          estimatedFields: Array.isArray(rawBreakdown.estimatedFields) ? rawBreakdown.estimatedFields : [],
        }
      : null;

  const costBasis: CostBasis = recordedTotal !== null ? 'recorded' : estimatedCost !== null ? 'estimated' : 'none';
  const totalCost = costBasis === 'recorded' ? recordedTotal : costBasis === 'estimated' ? estimatedCost : null;
  const profit =
    revenue !== null && totalCost !== null
      ? Math.round((revenue - totalCost) * 100) / 100
      : estimatedProfit;

  const tollStatus = String(trip?.tollStatus || '').toLowerCase();
  const tollDisabled = ['not_calculated', 'unavailable', 'failed', 'error'].includes(tollStatus);
  const recordedToll = present.toll ? buckets.toll : null;
  const toll = tollDisabled ? recordedToll : toNum(trip?.tollCost) ?? recordedToll;

  const stops = (trip?.stops || []).slice().sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));

  const departure = trip?.actualDeparture || trip?.plannedDeparture || null;
  const arrival = trip?.actualArrival || trip?.plannedArrival || null;
  const travelMin = minutesBetween(departure, arrival);
  const hasActualTravel = Boolean(trip?.actualDeparture && trip?.actualArrival);
  const actualTravelMin = hasActualTravel
    ? minutesBetween(trip?.actualDeparture, trip?.actualArrival)
    : null;

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
  const waitingMin = noStops ? 0 : waitingKnown ? waitingSum : null;
  const loadingMin = noStops ? 0 : loadingKnown ? loadingSum : null;
  const unloadingMin = noStops ? 0 : unloadingKnown ? unloadingSum : null;
  const drivingMin =
    actualTravelMin !== null && waitingMin !== null && loadingMin !== null && unloadingMin !== null
      ? Math.max(0, actualTravelMin - waitingMin - loadingMin - unloadingMin)
      : null;

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
  const fuelTypeRaw = String(truck?.fuelType || '').trim().toLowerCase();
  const isElectric = fuelTypeRaw.includes('electric');
  const emissionFactor = fuelTypeRaw ? FUEL_FACTORS[fuelTypeRaw] ?? null : null;
  // Fuel volume is distance × configured consumption. It never assumes a fuel type.
  const fuelLiters =
    !isElectric && distanceKm !== null && distanceKm > 0 && consumption !== null && consumption > 0
      ? (distanceKm * consumption) / 100
      : null;
  const co2Kg = fuelLiters !== null && emissionFactor !== null ? fuelLiters * emissionFactor : null;

  let emissionMissing: 'fuel_type' | 'consumption' | 'distance' | 'electric' | 'factor' | null = null;
  if (isElectric) emissionMissing = 'electric';
  else if (!fuelTypeRaw) emissionMissing = 'fuel_type';
  else if (consumption === null || consumption <= 0) emissionMissing = 'consumption';
  else if (distanceKm === null || distanceKm <= 0) emissionMissing = 'distance';
  else if (emissionFactor === null) emissionMissing = 'factor';

  return {
    id: String(trip?.id || ''),
    raw: trip,
    tripNumber: trip?.tripNumber || '',
    status: String(trip?.status || ''),
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
      toNum(trip?.emptyKilometers),
    travelMin,
    drivingMin,
    waitingMin,
    loadingMin,
    unloadingMin,
    departure,
    arrival,
    toll,
    fuelCost: present.fuel ? buckets.fuel : null,
    driverCost: present.driver ? buckets.driver : null,
    otherCost: present.other ? buckets.other : null,
    recordedTotal,
    estimatedCost,
    estimatedBreakdown,
    estimatedCalculatedAt: trip?.costCalculatedAt || null,
    totalCost,
    costBasis,
    revenue,
    profit,
    utilizationPct,
    currency,
    fuelTypeRaw,
    isElectric,
    consumption,
    emissionFactor,
    fuelLiters,
    co2Kg,
    emissionMissing,
    stops,
    costs,
  };
}

export type TripMetrics = ReturnType<typeof buildTripMetrics>;
