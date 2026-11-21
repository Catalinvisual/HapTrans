/**
 * The TMS only offers three transport types: FTL, Groupage (LTL) and Express.
 * Older imports and legacy rows still carry other spellings ("dedicated",
 * "ltl", "urgent", retail names, ...), so every write is mapped onto the
 * canonical set instead of being stored verbatim and shown raw in the UI.
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

export function isTransportType(value: unknown): value is TransportTypeValue {
  return (TRANSPORT_TYPES as readonly string[]).includes(String(value ?? '').trim().toLowerCase());
}
