/**
 * The order wizard only offers FTL, Groupage (LTL) and Express, but legacy and
 * imported orders can still carry other spellings ("dedicated", "ltl", ...).
 * Displaying the stored value raw made those orders look like a fourth type, so
 * every screen renders the canonical type instead.
 */

export const TRANSPORT_TYPES = ['ftl', 'groupage', 'express'] as const;
export type TransportTypeValue = (typeof TRANSPORT_TYPES)[number];

const ALIASES: Record<string, TransportTypeValue> = {
  ftl: 'ftl',
  fcl: 'ftl',
  full: 'ftl',
  'full truck': 'ftl',
  'full truck load': 'ftl',
  'full truckload': 'ftl',
  full_truckload: 'ftl',
  'full-truckload': 'ftl',
  // A truck dedicated to one shipment is a full truck load in this model.
  dedicated: 'ftl',
  dedicat: 'ftl',
  exclusive: 'ftl',
  'camion complet': 'ftl',
  complettladung: 'ftl',
  ltl: 'groupage',
  groupage: 'groupage',
  grupaj: 'groupage',
  sammelgut: 'groupage',
  'less than truckload': 'groupage',
  'less-than-truckload': 'groupage',
  partial: 'groupage',
  expres: 'express',
  express: 'express',
  urgent: 'express',
};

export function normalizeTransportType(value: unknown): TransportTypeValue {
  const key = String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  return ALIASES[key] || 'ftl';
}

export function transportTypeLabel(value: unknown): string {
  return normalizeTransportType(value).toUpperCase();
}
