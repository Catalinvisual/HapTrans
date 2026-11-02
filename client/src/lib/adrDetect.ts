// Centralized ADR detection. A trip/order is ADR only if it has real
// dangerous goods (UN number, ADR class) or a confirmed evaluation status.
// Statuses such as 'needs_review', 'ineligible' or 'none' must NOT flag a trip.

const POSITIVE_STATUSES = new Set([
  'exempt_1136',
  'limited_quantity',
  'excepted_quantity',
  'special_exemption',
  'sp188',
  'confirmed_full_adr',
  'ADR_FULL',
  'ADR_OVER1000',
  'ADR_CAT0',
  'ADR_TANK',
  'driver_cert_required',
  'driver_cert_missing',
  'incomplete_docs',
]);

const hasDgField = (c: any) => Boolean(
  c?.unNumber || c?.adrUnNumber || c?.adrClass || c?.isAdr,
);

export function orderIsAdr(o: any): boolean {
  if (!o) return false;
  if (o.isAdr === true) return true;
  if (POSITIVE_STATUSES.has(String(o.adrStatus || ''))) return true;
  if (Array.isArray(o.cargoItems) && o.cargoItems.some(hasDgField)) return true;
  return false;
}

export function tripIsAdr(tr: any): boolean {
  if (!tr) return false;
  if (Array.isArray(tr.orders) && tr.orders.some(orderIsAdr)) return true;
  return false;
}
