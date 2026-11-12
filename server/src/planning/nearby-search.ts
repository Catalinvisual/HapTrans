// "Search in the direct vicinity" — return loads around a stop or a route leg.
//
// The TMS already knows every empty kilometre a truck will drive. This module
// turns that into a commercial question: which unplanned orders sit close to
// where the truck will already be, and which of them are on the way to the next
// stop rather than behind it?
//
// It is deliberately geometry-only. Distances are great-circle kilometres, not
// road kilometres, so every distance it returns is labelled `greatCircle`. The
// empty-km saving is an ESTIMATE built from that distance and never replaces the
// router's own figures.
//
// Pure functions only: no TypeORM, no Nest, no database. Unit-tested in
// nearby-search.spec.ts.

export interface GeoPoint {
  lat: number;
  lng: number;
}

export type CapacityFit = 'fits' | 'over' | 'unverified';
export type DistanceBasis = 'greatCircle';

export interface NearbyOrderStop {
  id?: string | null;
  type?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  address?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  timeWindowMin?: any;
  timeWindowMax?: any;
  dateFrom?: string | null;
  timeFrom?: string | null;
  dateTo?: string | null;
  timeUntil?: string | null;
}

export interface NearbyCandidate {
  orderId: string;
  orderNumber: string;
  clientName: string;
  priority: string;
  transportType: string;
  pickup: {
    stopId: string | null;
    city: string;
    country: string;
    postalCode: string;
    point: GeoPoint;
    windowStart: string | null;
    windowEnd: string | null;
  } | null;
  delivery: {
    city: string;
    country: string;
    postalCode: string;
    point: GeoPoint | null;
  } | null;
  /** Great-circle km from the reference point to the pickup. */
  pickupDistanceKm: number;
  distanceBasis: DistanceBasis;
  /** Angle between "to pickup" and "to the next stop": 0 = straight ahead. */
  detourAngleDeg: number | null;
  onTheWay: boolean;
  weightKg: number;
  pallets: number;
  ldm: number;
  capacityFit: CapacityFit;
  /** Estimated loaded kilometres gained instead of driving back empty. */
  emptyKmSavingEstimateKm: number;
  /** Ranking key; higher is better. */
  score: number;
}

export interface NearbySearchInput {
  orders?: any[];
  origin: GeoPoint;
  radiusKm?: number;
  /** Next stop on the route, used to decide whether the load is on the way. */
  nextPoint?: GeoPoint | null;
  capacity?: { maxWeightKg?: number | null; maxPallets?: number | null; maxLdm?: number | null } | null;
  limit?: number;
}

const EARTH_RADIUS_KM = 6371;
const ON_THE_WAY_DEG = 60;

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

const num = (value: any): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function pointOf(stop: NearbyOrderStop | any | null | undefined): GeoPoint | null {
  if (!stop) return null;
  const rawLat = num(stop.latitude ?? stop.lat);
  const rawLng = num(stop.longitude ?? stop.lng);
  if (rawLat === null || rawLng === null) return null;
  if (Math.abs(rawLat) > 90 || Math.abs(rawLng) > 180) return null;
  // (0, 0) is in the Atlantic and is what a failed geocode stores. Treating it
  // as a real location would put every un-geocoded stop off the coast of Ghana.
  if (Math.abs(rawLat) < 0.0001 && Math.abs(rawLng) < 0.0001) return null;
  return { lat: rawLat, lng: rawLng };
}

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from `a` to `b`, degrees clockwise from north (0–360). */
export function bearingDeg(a: GeoPoint, b: GeoPoint): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Smallest absolute difference between two bearings, 0–180. */
export function bearingDifferenceDeg(a: number, b: number): number {
  const diff = Math.abs(((a - b) % 360 + 360) % 360);
  return diff > 180 ? 360 - diff : diff;
}

function orderWeight(order: any): number {
  let weight = 0;
  if (Array.isArray(order?.cargoItems) && order.cargoItems.length > 0) {
    for (const item of order.cargoItems) weight += Number(item?.weightKg) || 0;
  } else {
    weight += Number(order?.weightKg || order?.totalWeightKg) || 0;
  }
  return weight;
}

function orderPallets(order: any): number {
  let pallets = 0;
  if (Array.isArray(order?.cargoItems) && order.cargoItems.length > 0) {
    for (const item of order.cargoItems) {
      if (String(item?.unit || 'pallet').toLowerCase().trim() === 'pallet') {
        pallets += Number(item?.quantity) || 0;
      }
    }
  } else {
    pallets += Number(order?.pallets || order?.totalPallets) || 0;
  }
  return pallets;
}

function orderLdm(order: any): number {
  if (Array.isArray(order?.cargoItems) && order.cargoItems.length > 0) {
    let ldm = 0;
    for (const item of order.cargoItems) ldm += Number(item?.ldm) || 0;
    return ldm;
  }
  return Number(order?.loadingMeters) || 0;
}

function capacityFit(
  cargo: { weightKg: number; pallets: number; ldm: number },
  capacity: NearbySearchInput['capacity'],
): CapacityFit {
  if (!capacity) return 'unverified';
  let checked = false;
  if (num(capacity.maxWeightKg) !== null && Number(capacity.maxWeightKg) > 0 && cargo.weightKg > 0) {
    checked = true;
    if (cargo.weightKg > Number(capacity.maxWeightKg)) return 'over';
  }
  if (num(capacity.maxPallets) !== null && Number(capacity.maxPallets) > 0 && cargo.pallets > 0) {
    checked = true;
    if (cargo.pallets > Number(capacity.maxPallets)) return 'over';
  }
  if (num(capacity.maxLdm) !== null && Number(capacity.maxLdm) > 0 && cargo.ldm > 0) {
    checked = true;
    if (cargo.ldm > Number(capacity.maxLdm)) return 'over';
  }
  return checked ? 'fits' : 'unverified';
}

function isoOrNull(value: any): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

/**
 * Rank unplanned orders around a reference point.
 *
 * Orders whose pickup has no usable coordinates are omitted: the caller shows a
 * count of un-geocoded orders separately so the gap is visible instead of the
 * order silently disappearing from "nothing nearby".
 */
export function rankNearbyOrders(input: NearbySearchInput): {
  candidates: NearbyCandidate[];
  considered: number;
  withoutCoordinates: number;
  radiusKm: number;
  distanceBasis: DistanceBasis;
} {
  const origin = input.origin;
  const radiusKm = Math.max(1, Number(input.radiusKm) || 50);
  const nextBearing = input.nextPoint ? bearingDeg(origin, input.nextPoint) : null;
  const orders = (input.orders || []).filter(Boolean);
  const candidates: NearbyCandidate[] = [];
  let withoutCoordinates = 0;

  for (const order of orders) {
    const stops = [...(order?.stops || [])].sort(
      (a: any, b: any) => (Number(a?.sequence) || 0) - (Number(b?.sequence) || 0),
    );
    const pickup =
      stops.find((stop: any) => String(stop?.type || '').toLowerCase() === 'pickup') || stops[0] || null;
    const delivery =
      [...stops].reverse().find((stop: any) => String(stop?.type || '').toLowerCase() === 'delivery') ||
      stops[stops.length - 1] ||
      null;
    const pickupPoint = pointOf(pickup);
    if (!pickupPoint) {
      // Orders without any geocoded endpoint are counted once, not per stop.
      if (!pointOf(delivery)) withoutCoordinates += 1;
      continue;
    }

    const distance = haversineKm(origin, pickupPoint);
    if (distance > radiusKm) continue;

    const detourAngleDeg = nextBearing === null ? null : bearingDifferenceDeg(nextBearing, bearingDeg(origin, pickupPoint));
    const onTheWay = detourAngleDeg !== null && detourAngleDeg <= ON_THE_WAY_DEG;
    const cargo = { weightKg: orderWeight(order), pallets: orderPallets(order), ldm: orderLdm(order) };
    const fit = capacityFit(cargo, input.capacity || null);

    // A load that does not fit cannot be a saving; keep it out of the ranking
    // but still return it, the planner may want to switch truck.
    const proximityScore = 1 - distance / radiusKm;
    const score =
      (onTheWay ? 1 : 0) * 2 +
      proximityScore +
      (fit === 'fits' ? 0.5 : 0) +
      (cargo.weightKg > 0 ? Math.min(0.4, cargo.weightKg / 24000) : 0);

    candidates.push({
      orderId: String(order?.id || ''),
      orderNumber: String(order?.orderNumber || ''),
      clientName: String(order?.client?.name || ''),
      priority: String(order?.priority || 'normal'),
      transportType: String(order?.transportType || 'FTL'),
      pickup: {
        stopId: pickup?.id || null,
        city: String(pickup?.city || ''),
        country: String(pickup?.country || ''),
        postalCode: String(pickup?.postalCode || ''),
        point: pickupPoint,
        windowStart: isoOrNull(pickup?.timeWindowMin) || (pickup?.dateFrom
          ? isoOrNull(`${pickup.dateFrom}T${pickup.timeFrom || '00:00'}:00`)
          : null),
        windowEnd: isoOrNull(pickup?.timeWindowMax) || (pickup?.dateTo
          ? isoOrNull(`${pickup.dateTo}T${pickup.timeUntil || '23:59'}:00`)
          : null),
      },
      delivery: delivery
        ? {
          city: String(delivery?.city || ''),
          country: String(delivery?.country || ''),
          postalCode: String(delivery?.postalCode || ''),
          point: pointOf(delivery),
        }
        : null,
      pickupDistanceKm: Math.round(distance * 10) / 10,
      distanceBasis: 'greatCircle',
      detourAngleDeg: detourAngleDeg === null ? null : Math.round(detourAngleDeg),
      onTheWay,
      weightKg: Math.round(cargo.weightKg),
      pallets: Math.round(cargo.pallets),
      ldm: Math.round(cargo.ldm * 10) / 10,
      capacityFit: fit,
      // Estimate, not a routed figure: the truck stops loading empty kilometres
      // between the reference point and the pickup.
      emptyKmSavingEstimateKm: Math.round(distance * 10) / 10,
      score: Math.round(score * 1000) / 1000,
    });
  }

  candidates.sort((a, b) => {
    if (a.capacityFit === 'over' && b.capacityFit !== 'over') return 1;
    if (b.capacityFit === 'over' && a.capacityFit !== 'over') return -1;
    if (a.onTheWay !== b.onTheWay) return a.onTheWay ? -1 : 1;
    if (a.pickupDistanceKm !== b.pickupDistanceKm) return a.pickupDistanceKm - b.pickupDistanceKm;
    return b.score - a.score;
  });

  const limit = input.limit && input.limit > 0 ? Math.min(100, input.limit) : 30;
  return {
    candidates: candidates.slice(0, limit),
    considered: orders.length,
    withoutCoordinates,
    radiusKm,
    distanceBasis: 'greatCircle',
  };
}
