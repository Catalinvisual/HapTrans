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

export function buildTripMetrics(trip: any) {
  const orders = trip?.orders || [];
  const costs = trip?.costs || [];
  const truck = trip?.truck || null;
  const driverEntity = trip?.driver || trip?.truck?.driver || null;
  const driverName = nameOfDriver(driverEntity) || trip?.carrierDriverName || '';

  const truckPlate = truck?.plateNumber || trip?.carrierTruckPlate || '';
  const trailerPlate =
    trip?.trailer?.plateNumber ||
    trip?.trailerPlate ||
    trip?.carrierTrailerPlate ||
    truck?.trailer?.plateNumber ||
    '';

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
  const totalCost = recordedTotal !== null ? recordedTotal : estimatedCost;
  const profit = revenue !== null && totalCost !== null ? revenue - totalCost : estimatedProfit;

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
  const fuelTypeRaw = String(truck?.fuelType || '').toLowerCase();
  const isElectric = fuelTypeRaw.includes('electric');
  const knownFactor = Boolean(fuelTypeRaw && FUEL_FACTORS[fuelTypeRaw]);
  const emissionAssumed = !isElectric && !knownFactor;
  const emissionFactor = isElectric ? null : FUEL_FACTORS[knownFactor ? fuelTypeRaw : 'diesel'] ?? null;
  const fuelLiters =
    !isElectric && distanceKm !== null && consumption !== null && consumption > 0
      ? (distanceKm * consumption) / 100
      : null;
  const co2Kg = fuelLiters !== null && emissionFactor !== null ? fuelLiters * emissionFactor : null;

  return {
    id: String(trip?.id || ''),
    raw: trip,
    tripNumber: trip?.tripNumber || '',
    status: String(trip?.status || ''),
    truckId: truck?.id || '',
    driverId: driverEntity?.id || '',
    truckPlate,
    trailerPlate,
    driverName,
    driverEntity,
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
    totalCost,
    revenue,
    profit,
    utilizationPct,
    currency,
    fuelTypeRaw,
    isElectric,
    emissionAssumed,
    consumption,
    emissionFactor,
    fuelLiters,
    co2Kg,
    stops,
    costs,
  };
}
