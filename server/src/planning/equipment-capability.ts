/**
 * Equipment capability for a truck + trailer combination.
 *
 * Requirements arrive from the order wizard as described text, e.g.
 * "Camion mega" or "Mega Trailer", and are stored verbatim. Matching those
 * strings directly against truck types produced false "equipment missing"
 * warnings even for a correctly configured vehicle, so every requirement is
 * first mapped to a canonical code.
 *
 * Mega is not a height. The external height used for bridge and tunnel routing
 * says nothing about the 3.00 m internal loading height of a mega trailer, so
 * mega capability is only confirmed by an explicit mega trailer/body type or a
 * mega feature. Anything else is either a verified incompatibility or an
 * unverified capability — never a silent pass.
 */

export type EquipmentCode =
  | 'mega'
  | 'frigo'
  | 'lift'
  | 'adr'
  | 'tautliner'
  | 'walking_floor'
  | 'container'
  | 'flatbed'
  | 'box'
  | 'unknown';

export interface EquipmentAssessment {
  code: EquipmentCode;
  /** True only when the combination is known to provide the capability. */
  supported: boolean;
  /** False when the data needed to decide is absent (not an incompatibility). */
  verified: boolean;
  reason: string;
}

const normalizeText = (value: unknown): string =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Maps stored requirement text (label or code, any language) to one code. */
export function canonicalEquipmentCode(requirement: unknown): EquipmentCode {
  const value = normalizeText(requirement);
  if (!value) return 'unknown';
  if (value.includes('mega')) return 'mega';
  if (/(frigo|reefer|refriger|isotherm|frigorific)/.test(value)) return 'frigo';
  if (/(tail ?lift|hayon|ladebordwand|oblon|winde|lift)/.test(value)) return 'lift';
  if (/(adr|hazard|gefahrgut|materii periculoase)/.test(value)) return 'adr';
  if (/(walking ?floor|sol|plancher roulant)/.test(value)) return 'walking_floor';
  if (/container/.test(value)) return 'container';
  if (/(flatbed|plateau|platform|open ?side)/.test(value)) return 'flatbed';
  if (/(tautliner|curtain|prelata|bache|planen|tilt)/.test(value)) return 'tautliner';
  if (/(box|fourgon|koffer|kasten|standard)/.test(value)) return 'box';
  return 'unknown';
}

/** Flattens feature/equipment arrays, including JSON-encoded entries. */
function flattenStrings(values: unknown[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      out.push(...flattenStrings(value));
      continue;
    }
    const text = String(value).trim();
    if (!text) continue;
    if (text.startsWith('[')) {
      try {
        out.push(...flattenStrings(JSON.parse(text)));
        continue;
      } catch {
        // Not JSON; fall through and keep the literal value.
      }
    }
    out.push(normalizeText(text));
  }
  return out;
}

interface Combination {
  tokens: string[];
  truckType: string;
  trailerType: string;
  hasTrailer: boolean;
  hasTypeData: boolean;
  hasFeatureData: boolean;
}

function combination(truck: any, trailer: any): Combination {
  const truckType = normalizeText(truck?.truckType || truck?.type);
  const trailerType = normalizeText(trailer?.type || trailer?.trailerType);
  const features = flattenStrings([
    truck?.features,
    truck?.equipment,
    truck?.equipmentRequirements,
    trailer?.features,
    trailer?.equipment,
    trailer?.equipmentRequirements,
  ]);
  return {
    tokens: [truckType, trailerType, ...features].filter(Boolean),
    truckType,
    trailerType,
    hasTrailer: !!trailer,
    hasTypeData: !!(truckType || trailerType),
    hasFeatureData: features.length > 0,
  };
}

const has = (c: Combination, ...needles: string[]) =>
  c.tokens.some((token) => needles.some((needle) => token.includes(needle)));

const describe = (value: string) => (value ? `"${value}"` : 'not recorded');

export function assessEquipment(truck: any, trailer: any, requirement: unknown): EquipmentAssessment {
  const code = canonicalEquipmentCode(requirement);
  const c = combination(truck, trailer);
  const raw = String(requirement ?? '').trim();

  switch (code) {
    case 'mega': {
      const supported = has(c, 'mega');
      if (supported) {
        return { code, supported: true, verified: true, reason: `the combination is configured as a mega trailer (${describe(c.trailerType || c.truckType)}).` };
      }
      if (!c.hasTrailer) {
        return { code, supported: false, verified: false, reason: 'no trailer is assigned, so mega capability cannot be verified.' };
      }
      if (!c.hasTypeData && !c.hasFeatureData) {
        return { code, supported: false, verified: false, reason: 'neither body type nor features are recorded, so mega capability cannot be verified.' };
      }
      // A body type alone cannot disprove a 3.00 m internal loading height: a
      // refrigerated trailer can also be a mega trailer. Without a recorded
      // internal height the capability is unverified, not incompatible, and
      // must not block the assignment.
      const trailerLabel = trailer?.plateNumber ? `Trailer ${trailer.plateNumber}` : 'The assigned combination';
      return {
        code,
        supported: false,
        verified: false,
        reason: `${trailerLabel} is recorded as ${describe(c.trailerType || c.truckType)} and its internal loading height is not recorded, so mega capability (3.00 m internal) cannot be verified. External vehicle height does not prove it.`,
      };
    }
    case 'frigo': {
      const supported = has(c, 'frigo', 'reefer', 'isotherm', 'refriger');
      return {
        code,
        supported,
        verified: c.hasTypeData || c.hasFeatureData,
        reason: supported
          ? 'the combination has refrigeration.'
          : `the combination is ${describe(c.trailerType || c.truckType || c.truckType)} without refrigeration.`,
      };
    }
    case 'lift': {
      const supported = has(c, 'lift', 'hayon', 'oblon', 'ladebordwand');
      return {
        code,
        supported,
        verified: c.hasFeatureData || c.hasTypeData,
        reason: supported
          ? 'the combination has a tail lift.'
          : 'no tail lift is recorded on the truck or trailer.',
      };
    }
    case 'adr': {
      const supported = has(c, 'adr', 'hazard');
      return {
        code,
        supported,
        verified: c.hasFeatureData || c.hasTypeData,
        reason: supported ? 'the combination is ADR certified.' : 'no ADR certification is recorded on the truck or trailer.',
      };
    }
    case 'walking_floor':
    case 'container':
    case 'flatbed':
    case 'box':
    case 'tautliner': {
      const supported = has(c, code === 'box' ? 'box' : code, 'tautliner', 'curtain', 'prelata', 'bache', 'mega');
      return {
        code,
        supported,
        verified: c.hasTypeData,
        reason: supported
          ? `the combination provides ${code.replace('_', ' ')} capability.`
          : `the combination is ${describe(c.trailerType || c.truckType)} and does not provide ${code.replace('_', ' ')} capability.`,
      };
    }
    default:
      return {
        code: 'unknown',
        supported: false,
        verified: false,
        reason: `"${raw}" is not a recognised equipment requirement, so compatibility cannot be verified.`,
      };
  }
}
