import { resolveCountryCode } from '../emissions/country-database';

/**
 * Compact dispatcher-facing context for TMS notifications.
 *
 * A Windows toast shows one bold title and a short body, so every TMS
 * notification carries the identifiers the office actually looks for — trip,
 * order, route and driver — instead of only a reference number.
 */
export interface TripNotificationContext {
  tripRef: string;
  orderRefs: string;
  route: string;
  driver: string;
  /** `TRP-2026-0005 · ORD-2026-004521` */
  headline: string;
  /** `TRP-2026-0005 · ORD-2026-004521 · Berlin → Brașov · Jan Kowalski` */
  line: string;
}

const MAX_ORDER_REFS = 3;

const STATUS_LABELS: Record<string, string> = {
  assigned: 'Trip assigned',
  dispatched: 'Trip dispatched',
  driver_accepted: 'Trip accepted',
  started: 'Trip started',
  loading: 'Loading',
  unloading: 'Unloading',
  driving: 'Driving',
  in_progress: 'In progress',
  partially_delivered: 'Partially delivered',
  completed: 'Completed',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  delayed: 'Delayed',
};

export function tripNotificationContext(trip: any): TripNotificationContext {
  const tripRef = text(trip?.tripNumber);
  const orderRefs = orderReferences(trip).join(', ');
  const route = tripRoute(trip);
  const driver =
    text(trip?.driver?.user?.name) || text(trip?.truck?.driver?.user?.name);
  return {
    tripRef,
    orderRefs,
    route,
    driver,
    headline: [tripRef, orderRefs].filter(Boolean).join(' · '),
    line: [tripRef, orderRefs, route, driver].filter(Boolean).join(' · '),
  };
}

/** Title = trip/order, body = route · driver · event. */
export function tripNotificationText(
  trip: any,
  event: string,
  fallbackDriver?: string,
): { title: string; message: string } {
  const context = tripNotificationContext(trip);
  const driver = context.driver || text(fallbackDriver);
  const message = [context.route, driver, text(event)].filter(Boolean).join(' · ');
  return {
    title: context.headline || text(event) || 'Trip',
    message: message || text(event),
  };
}

/**
 * Stop place as it appears in a toast: `București (RO)`. The city keeps the
 * name stored on the trip (drivers and paperwork use it verbatim); the ISO
 * code is what tells two same-named cities in different countries apart.
 */
export function stopPlaceLabel(stop: any): string {
  const city = text(stop?.city);
  if (!city) return '';
  const iso = resolveCountryCode(stop?.country);
  return iso ? `${city} (${iso})` : city;
}

/** Readable label for a raw trip status (`driver_accepted` → `Trip accepted`). */
export function tripStatusLabel(status: unknown): string {
  const key = text(status).toLowerCase();
  if (!key) return '';
  return STATUS_LABELS[key] || key.replace(/_/g, ' ');
}

function text(value: any): string {
  return String(value ?? '').trim();
}

function orderReferences(trip: any): string[] {
  const refs = new Set<string>();
  for (const order of trip?.orders || []) {
    const ref = text(order?.orderNumber);
    if (ref) refs.add(ref);
  }
  for (const stop of trip?.stops || []) {
    for (const task of stop?.tasks || []) {
      const ref = text(task?.order?.orderNumber);
      if (ref) refs.add(ref);
    }
  }
  return [...refs].slice(0, MAX_ORDER_REFS);
}

function tripRoute(trip: any): string {
  const stops = [...(trip?.stops || [])].sort(
    (a, b) => Number(a?.sequence || 0) - Number(b?.sequence || 0),
  );
  if (!stops.length) return '';
  const hasTask = (stop: any, type: string) =>
    (stop?.tasks || []).some((task: any) => text(task?.type).toLowerCase() === type);
  const pickup = stops.find((stop) => hasTask(stop, 'load'));
  const dropoff = [...stops].reverse().find((stop) => hasTask(stop, 'unload'));
  const from = stopPlaceLabel(pickup) || stopPlaceLabel(stops[0]);
  const to = stopPlaceLabel(dropoff) || stopPlaceLabel(stops[stops.length - 1]);
  if (from && to && from !== to) return `${from} → ${to}`;
  return from || to;
}
