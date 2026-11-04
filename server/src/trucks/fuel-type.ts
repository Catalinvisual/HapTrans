/**
 * Canonical truck energy/fuel types.
 *
 * The database column stays `varchar` for backward compatibility, but every
 * write is validated against this enum and every read is normalized here.
 * This avoids a destructive PostgreSQL enum migration and, importantly, does
 * not silently map legacy rows without fuel data to Diesel.
 */
export enum TruckFuelType {
  DIESEL = 'DIESEL',
  HVO = 'HVO',
  BIODIESEL = 'BIODIESEL',
  CNG = 'CNG',
  LNG = 'LNG',
  LPG = 'LPG',
  ELECTRIC = 'ELECTRIC',
  HYDROGEN_FCEV = 'HYDROGEN_FCEV',
  HYDROGEN_ICE = 'HYDROGEN_ICE',
  GASOLINE = 'GASOLINE',
  HYBRID_DIESEL = 'HYBRID_DIESEL',
  HYBRID_GASOLINE = 'HYBRID_GASOLINE',
  OTHER = 'OTHER',
}

export type FuelConsumptionUnit = 'L/100 km' | 'kg/100 km' | 'kWh/100 km';

export type FuelFactorReason =
  | 'electricity_source_not_configured'
  | 'hydrogen_source_not_configured'
  | 'renewable_fuel_methodology_not_configured'
  | 'hybrid_model_not_configured'
  | 'fuel_factor_not_configured'
  | 'unit_not_configured';

export interface TruckFuelProfile {
  code: TruckFuelType;
  labelKey: string;
  unit: FuelConsumptionUnit | null;
  unitKey: string;
  /** Tank-to-wheel CO2 factor per consumption unit, only when configured. */
  factorKgPerUnit: number | null;
  factorReason: FuelFactorReason | null;
}

export const TRUCK_FUEL_PROFILES: Record<TruckFuelType, TruckFuelProfile> = {
  [TruckFuelType.DIESEL]: {
    code: TruckFuelType.DIESEL,
    labelKey: 'truck_fuel_diesel',
    unit: 'L/100 km',
    unitKey: 'truck_fuel_unit_l',
    factorKgPerUnit: 2.68,
    factorReason: null,
  },
  [TruckFuelType.HVO]: {
    code: TruckFuelType.HVO,
    labelKey: 'truck_fuel_hvo',
    unit: 'L/100 km',
    unitKey: 'truck_fuel_unit_l',
    factorKgPerUnit: null,
    factorReason: 'renewable_fuel_methodology_not_configured',
  },
  [TruckFuelType.BIODIESEL]: {
    code: TruckFuelType.BIODIESEL,
    labelKey: 'truck_fuel_biodiesel',
    unit: 'L/100 km',
    unitKey: 'truck_fuel_unit_l',
    factorKgPerUnit: null,
    factorReason: 'renewable_fuel_methodology_not_configured',
  },
  [TruckFuelType.CNG]: {
    code: TruckFuelType.CNG,
    labelKey: 'truck_fuel_cng',
    unit: 'kg/100 km',
    unitKey: 'truck_fuel_unit_kg',
    factorKgPerUnit: 2.75,
    factorReason: null,
  },
  [TruckFuelType.LNG]: {
    code: TruckFuelType.LNG,
    labelKey: 'truck_fuel_lng',
    unit: 'kg/100 km',
    unitKey: 'truck_fuel_unit_kg',
    factorKgPerUnit: 2.75,
    factorReason: null,
  },
  [TruckFuelType.LPG]: {
    code: TruckFuelType.LPG,
    labelKey: 'truck_fuel_lpg',
    unit: 'L/100 km',
    unitKey: 'truck_fuel_unit_l',
    factorKgPerUnit: 1.63,
    factorReason: null,
  },
  [TruckFuelType.ELECTRIC]: {
    code: TruckFuelType.ELECTRIC,
    labelKey: 'truck_fuel_electric',
    unit: 'kWh/100 km',
    unitKey: 'truck_fuel_unit_kwh',
    factorKgPerUnit: null,
    factorReason: 'electricity_source_not_configured',
  },
  [TruckFuelType.HYDROGEN_FCEV]: {
    code: TruckFuelType.HYDROGEN_FCEV,
    labelKey: 'truck_fuel_hydrogen_fcev',
    unit: 'kg/100 km',
    unitKey: 'truck_fuel_unit_kg',
    factorKgPerUnit: null,
    factorReason: 'hydrogen_source_not_configured',
  },
  [TruckFuelType.HYDROGEN_ICE]: {
    code: TruckFuelType.HYDROGEN_ICE,
    labelKey: 'truck_fuel_hydrogen_ice',
    unit: 'kg/100 km',
    unitKey: 'truck_fuel_unit_kg',
    factorKgPerUnit: null,
    factorReason: 'hydrogen_source_not_configured',
  },
  [TruckFuelType.GASOLINE]: {
    code: TruckFuelType.GASOLINE,
    labelKey: 'truck_fuel_gasoline',
    unit: 'L/100 km',
    unitKey: 'truck_fuel_unit_l',
    factorKgPerUnit: 2.31,
    factorReason: null,
  },
  [TruckFuelType.HYBRID_DIESEL]: {
    code: TruckFuelType.HYBRID_DIESEL,
    labelKey: 'truck_fuel_hybrid_diesel',
    unit: 'L/100 km',
    unitKey: 'truck_fuel_unit_l',
    factorKgPerUnit: null,
    factorReason: 'hybrid_model_not_configured',
  },
  [TruckFuelType.HYBRID_GASOLINE]: {
    code: TruckFuelType.HYBRID_GASOLINE,
    labelKey: 'truck_fuel_hybrid_gasoline',
    unit: 'L/100 km',
    unitKey: 'truck_fuel_unit_l',
    factorKgPerUnit: null,
    factorReason: 'hybrid_model_not_configured',
  },
  [TruckFuelType.OTHER]: {
    code: TruckFuelType.OTHER,
    labelKey: 'truck_fuel_other',
    unit: null,
    unitKey: 'truck_fuel_unit_unknown',
    factorKgPerUnit: null,
    factorReason: 'unit_not_configured',
  },
};

/** Known legacy/import aliases. Ambiguous `hybrid` and `hydrogen` are not guessed. */
const LEGACY_ALIASES: Record<string, TruckFuelType> = {
  diesel: TruckFuelType.DIESEL,
  hvo: TruckFuelType.HVO,
  hvo100: TruckFuelType.HVO,
  renewable_diesel: TruckFuelType.HVO,
  biodiesel: TruckFuelType.BIODIESEL,
  fame: TruckFuelType.BIODIESEL,
  b100: TruckFuelType.BIODIESEL,
  cng: TruckFuelType.CNG,
  compressed_natural_gas: TruckFuelType.CNG,
  lng: TruckFuelType.LNG,
  liquefied_natural_gas: TruckFuelType.LNG,
  lpg: TruckFuelType.LPG,
  autogas: TruckFuelType.LPG,
  electric: TruckFuelType.ELECTRIC,
  bev: TruckFuelType.ELECTRIC,
  battery_electric: TruckFuelType.ELECTRIC,
  hydrogen_fcev: TruckFuelType.HYDROGEN_FCEV,
  fcev: TruckFuelType.HYDROGEN_FCEV,
  fuel_cell: TruckFuelType.HYDROGEN_FCEV,
  hydrogen_ice: TruckFuelType.HYDROGEN_ICE,
  h2_ice: TruckFuelType.HYDROGEN_ICE,
  petrol: TruckFuelType.GASOLINE,
  gasoline: TruckFuelType.GASOLINE,
  hybrid_diesel: TruckFuelType.HYBRID_DIESEL,
  diesel_hybrid: TruckFuelType.HYBRID_DIESEL,
  hybrid_gasoline: TruckFuelType.HYBRID_GASOLINE,
  petrol_hybrid: TruckFuelType.HYBRID_GASOLINE,
  gasoline_hybrid: TruckFuelType.HYBRID_GASOLINE,
  other: TruckFuelType.OTHER,
};

export function normalizeTruckFuelType(value: unknown): TruckFuelType | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const upper = raw.toUpperCase().replace(/[\s-]+/g, '_');
  if ((TRUCK_FUEL_PROFILES as Record<string, TruckFuelProfile>)[upper]) {
    return upper as TruckFuelType;
  }
  const lower = raw.toLowerCase().replace(/[\s-]+/g, '_');
  return LEGACY_ALIASES[lower] || null;
}

export function getTruckFuelProfile(value: unknown): TruckFuelProfile | null {
  const normalized = normalizeTruckFuelType(value);
  return normalized ? TRUCK_FUEL_PROFILES[normalized] : null;
}

export function isTruckFuelType(value: unknown): value is TruckFuelType {
  return normalizeTruckFuelType(value) !== null;
}

export const TRUCK_FUEL_TYPE_VALUES = Object.values(TruckFuelType);

export const fuelTypeTransformer = {
  to: (value: unknown): TruckFuelType | null => normalizeTruckFuelType(value),
  from: (value: unknown): TruckFuelType | null => normalizeTruckFuelType(value),
};
