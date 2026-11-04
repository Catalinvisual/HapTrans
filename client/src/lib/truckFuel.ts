/**
 * Client mirror of the canonical backend truck fuel/energy enum.
 * The values are part of the API contract and must match
 * `server/src/trucks/fuel-type.ts`.
 */

export const TRUCK_FUEL_TYPES = [
  'DIESEL',
  'HVO',
  'BIODIESEL',
  'CNG',
  'LNG',
  'LPG',
  'ELECTRIC',
  'HYDROGEN_FCEV',
  'HYDROGEN_ICE',
  'GASOLINE',
  'HYBRID_DIESEL',
  'HYBRID_GASOLINE',
  'OTHER',
] as const;

export type TruckFuelType = (typeof TRUCK_FUEL_TYPES)[number];

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
  priceUnit: string;
  factorKgPerUnit: number | null;
  factorReason: FuelFactorReason | null;
}

const PROFILES: Record<TruckFuelType, TruckFuelProfile> = {
  DIESEL: {
    code: 'DIESEL',
    labelKey: 'truck_fuel_diesel',
    unit: 'L/100 km',
    unitKey: 'truck_fuel_unit_l',
    factorKgPerUnit: 2.68,
    factorReason: null,
  },
  HVO: {
    code: 'HVO',
    labelKey: 'truck_fuel_hvo',
    unit: 'L/100 km',
    unitKey: 'truck_fuel_unit_l',
    factorKgPerUnit: null,
    factorReason: 'renewable_fuel_methodology_not_configured',
  },
  BIODIESEL: {
    code: 'BIODIESEL',
    labelKey: 'truck_fuel_biodiesel',
    unit: 'L/100 km',
    unitKey: 'truck_fuel_unit_l',
    factorKgPerUnit: null,
    factorReason: 'renewable_fuel_methodology_not_configured',
  },
  CNG: {
    code: 'CNG',
    labelKey: 'truck_fuel_cng',
    unit: 'kg/100 km',
    unitKey: 'truck_fuel_unit_kg',
    factorKgPerUnit: 2.75,
    factorReason: null,
  },
  LNG: {
    code: 'LNG',
    labelKey: 'truck_fuel_lng',
    unit: 'kg/100 km',
    unitKey: 'truck_fuel_unit_kg',
    factorKgPerUnit: 2.75,
    factorReason: null,
  },
  LPG: {
    code: 'LPG',
    labelKey: 'truck_fuel_lpg',
    unit: 'L/100 km',
    unitKey: 'truck_fuel_unit_l',
    factorKgPerUnit: 1.63,
    factorReason: null,
  },
  ELECTRIC: {
    code: 'ELECTRIC',
    labelKey: 'truck_fuel_electric',
    unit: 'kWh/100 km',
    unitKey: 'truck_fuel_unit_kwh',
    factorKgPerUnit: null,
    factorReason: 'electricity_source_not_configured',
  },
  HYDROGEN_FCEV: {
    code: 'HYDROGEN_FCEV',
    labelKey: 'truck_fuel_hydrogen_fcev',
    unit: 'kg/100 km',
    unitKey: 'truck_fuel_unit_kg',
    factorKgPerUnit: null,
    factorReason: 'hydrogen_source_not_configured',
  },
  HYDROGEN_ICE: {
    code: 'HYDROGEN_ICE',
    labelKey: 'truck_fuel_hydrogen_ice',
    unit: 'kg/100 km',
    unitKey: 'truck_fuel_unit_kg',
    factorKgPerUnit: null,
    factorReason: 'hydrogen_source_not_configured',
  },
  GASOLINE: {
    code: 'GASOLINE',
    labelKey: 'truck_fuel_gasoline',
    unit: 'L/100 km',
    unitKey: 'truck_fuel_unit_l',
    factorKgPerUnit: 2.31,
    factorReason: null,
  },
  HYBRID_DIESEL: {
    code: 'HYBRID_DIESEL',
    labelKey: 'truck_fuel_hybrid_diesel',
    unit: 'L/100 km',
    unitKey: 'truck_fuel_unit_l',
    factorKgPerUnit: null,
    factorReason: 'hybrid_model_not_configured',
  },
  HYBRID_GASOLINE: {
    code: 'HYBRID_GASOLINE',
    labelKey: 'truck_fuel_hybrid_gasoline',
    unit: 'L/100 km',
    unitKey: 'truck_fuel_unit_l',
    factorKgPerUnit: null,
    factorReason: 'hybrid_model_not_configured',
  },
  OTHER: {
    code: 'OTHER',
    labelKey: 'truck_fuel_other',
    unit: null,
    unitKey: 'truck_fuel_unit_unknown',
    factorKgPerUnit: null,
    factorReason: 'unit_not_configured',
  },
};

for (const profile of Object.values(PROFILES)) {
  profile.priceUnit = profile.unit ? `€/${profile.unit.split('/')[0]}` : '€';
}

const LEGACY_ALIASES: Record<string, TruckFuelType> = {
  diesel: 'DIESEL',
  hvo: 'HVO',
  hvo100: 'HVO',
  renewable_diesel: 'HVO',
  biodiesel: 'BIODIESEL',
  fame: 'BIODIESEL',
  b100: 'BIODIESEL',
  cng: 'CNG',
  compressed_natural_gas: 'CNG',
  lng: 'LNG',
  liquefied_natural_gas: 'LNG',
  lpg: 'LPG',
  autogas: 'LPG',
  electric: 'ELECTRIC',
  bev: 'ELECTRIC',
  battery_electric: 'ELECTRIC',
  hydrogen_fcev: 'HYDROGEN_FCEV',
  fcev: 'HYDROGEN_FCEV',
  fuel_cell: 'HYDROGEN_FCEV',
  hydrogen_ice: 'HYDROGEN_ICE',
  h2_ice: 'HYDROGEN_ICE',
  petrol: 'GASOLINE',
  gasoline: 'GASOLINE',
  hybrid_diesel: 'HYBRID_DIESEL',
  diesel_hybrid: 'HYBRID_DIESEL',
  hybrid_gasoline: 'HYBRID_GASOLINE',
  petrol_hybrid: 'HYBRID_GASOLINE',
  gasoline_hybrid: 'HYBRID_GASOLINE',
  other: 'OTHER',
};

export function normalizeTruckFuelType(value: unknown): TruckFuelType | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const upper = raw.toUpperCase().replace(/[\s-]+/g, '_');
  if ((PROFILES as Record<string, TruckFuelProfile>)[upper]) return upper as TruckFuelType;
  const lower = raw.toLowerCase().replace(/[\s-]+/g, '_');
  return LEGACY_ALIASES[lower] || null;
}

export function getTruckFuelProfile(value: unknown): TruckFuelProfile | null {
  const normalized = normalizeTruckFuelType(value);
  return normalized ? PROFILES[normalized] : null;
}

type Translate = (key: string, options?: any) => unknown;

function translate(t: Translate, key: string, fallback: string, options?: Record<string, unknown>): string {
  return String(t(key, { ...options, defaultValue: fallback }));
}

export function fuelTypeLabel(value: unknown, t: Translate): string {
  const code = normalizeTruckFuelType(value);
  if (!code) return translate(t, 'truck_fuel_unsupported', 'Unsupported fuel type');
  return translate(t, PROFILES[code].labelKey, code);
}

export function fuelUnitLabel(
  profileOrValue: TruckFuelProfile | string | null | undefined,
  t: Translate,
): string {
  const profile = typeof profileOrValue === 'string' ? getTruckFuelProfile(profileOrValue) : profileOrValue;
  if (!profile?.unit) return translate(t, 'truck_fuel_unit_unknown', 'unit not configured');
  return profile.unit;
}

export function fuelConsumptionLabel(
  profileOrValue: TruckFuelProfile | string | null | undefined,
  t: Translate,
): string {
  const unit = fuelUnitLabel(profileOrValue, t);
  return translate(t, 'truck_fuel_consumption_per_unit', `Consumption (${unit})`, { unit });
}

export function fuelEnergyPriceLabel(
  profileOrValue: TruckFuelProfile | string | null | undefined,
  t: Translate,
): string {
  const unit = fuelUnitLabel(profileOrValue, t);
  return translate(t, 'truck_energy_price_per_unit', `Energy price (€/${unit})`, { unit });
}

export function emissionUnavailableKey(reason: FuelFactorReason | null): string {
  switch (reason) {
    case 'electricity_source_not_configured':
      return 'truck_emission_electric_unconfigured';
    case 'hydrogen_source_not_configured':
      return 'truck_emission_hydrogen_unconfigured';
    case 'renewable_fuel_methodology_not_configured':
      return 'truck_emission_renewable_unconfigured';
    case 'hybrid_model_not_configured':
      return 'truck_emission_hybrid_unconfigured';
    case 'unit_not_configured':
      return 'truck_energy_unavailable';
    default:
      return 'truck_emission_factor_unconfigured';
  }
}

/** Kept for compatibility with existing planning imports. Keys are canonical. */
export const FUEL_FACTORS: Record<string, number> = Object.fromEntries(
  Object.values(PROFILES)
    .filter((profile) => profile.factorKgPerUnit !== null)
    .map((profile) => [profile.code, profile.factorKgPerUnit as number]),
);
