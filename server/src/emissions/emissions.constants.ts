/**
 * CO2 & Environmental Management — shared domain constants.
 *
 * The calculation engine version is stored with every result and every report.
 * Bump it whenever a formula, default allocation rule or rounding rule changes:
 * stored results then remain explainable against the engine that produced them.
 */
export const EMISSION_ENGINE_VERSION = '1.0.0';

/** Reconciliation tolerance for country segments against the route distance. */
export const SEGMENT_RECONCILIATION_TOLERANCE_PERCENT = 0.5;

/** Rounding used for stored emission quantities (kg CO2e). */
export const EMISSION_DECIMALS = 6;

export enum EmissionTripLifecycle {
  PENDING_DATA = 'pending_data',
  ESTIMATED = 'estimated',
  PRELIMINARY = 'preliminary',
  VERIFIED = 'verified',
  FINALIZED = 'finalized',
  CORRECTED = 'corrected',
  RECONCILIATION_REQUIRED = 'reconciliation_required',
}

export enum EmissionDataQuality {
  ACTUAL = 'actual',
  RECONCILED = 'reconciled',
  ESTIMATED = 'estimated',
  MISSING = 'missing',
}

export enum EmissionCalculationMethod {
  /** Fuel quantity from matched fuel-card/telematics transactions. */
  ACTUAL_FUEL = 'actual_fuel',
  /** Distance x vehicle-specific consumption (recorded on the truck). */
  VEHICLE_SPECIFIC_CONSUMPTION = 'vehicle_specific_consumption',
  /** Distance x documented secondary default consumption factor. */
  SECONDARY_ESTIMATION_FACTOR = 'secondary_estimation_factor',
  /** Distance x per-km emission factor (no fuel quantity available). */
  DISTANCE_EMISSION_FACTOR = 'distance_emission_factor',
  /** Manual calculator simulation. */
  MANUAL_CALCULATION = 'manual_calculation',
  /** Customer or subcontractor supplied and verified figures. */
  SUPPLIER_DECLARED = 'supplier_declared',
}

export enum CountrySegmentMethod {
  /** Segment distance came from a routed geometry whose country was resolved. */
  ROUTE_GEOMETRY = 'route_geometry',
  /** Leg distances are derived from the recorded stop sequence. */
  STOP_SEQUENCE = 'stop_sequence',
  /** Total distance apportioned across legs by geodesic leg length. */
  GEODESIC_PROPORTIONAL = 'geodesic_proportional',
  /** Explicit distances entered by a user in the manual calculator. */
  MANUAL_SEGMENTS = 'manual_segments',
}

export enum EmissionAllocationBasis {
  /** tonne-kilometres (weight x distance) — EN ISO 14083 default for shared loads. */
  TONNE_KM = 'tonne_km',
  /** Distance only, when cargo weight is not recorded. */
  DISTANCE = 'distance',
  /** Equal share — only when neither weight nor distance is available. */
  EQUAL = 'equal',
}

export enum EmissionVerificationStatus {
  VERIFIED = 'verified',
  UNVERIFIED = 'unverified',
  MISSING_DATA = 'missing_data',
  EXPIRED = 'expired',
  REQUIRES_REVIEW = 'requires_review',
}

export enum EmissionFactorVerification {
  VERIFIED = 'verified',
  PROVISIONAL = 'provisional',
  NEEDS_REVIEW = 'needs_review',
}

export enum EmissionBoundary {
  TTW = 'ttw',
  WTT = 'wtt',
  WTW = 'wtw',
}

export enum EmissionReportKind {
  COMPANY = 'company',
  DAILY = 'daily',
  MONTHLY = 'monthly',
  ANNUAL = 'annual',
  COUNTRY = 'country',
  FLEET = 'fleet',
  TRUCK = 'truck',
  DRIVER = 'driver_efficiency',
  CUSTOMER = 'customer',
  TRIP = 'trip',
  FUEL = 'fuel_consumption',
  EMPTY_RUNNING = 'empty_running',
  WTW = 'wtw',
  DATA_QUALITY = 'data_quality',
  COMPLIANCE = 'compliance',
  SUBCONTRACTOR = 'subcontractor',
}

export type ReportingScope =
  | 'mandatory_legal'
  | 'road_charging'
  | 'voluntary_reporting'
  | 'customer_contractual'
  | 'ghg_protocol_scope_1'
  | 'ghg_protocol_scope_2'
  | 'ghg_protocol_scope_3';

/**
 * Emission factor datasets. Only datasets that have actually been transcribed
 * from a published source belong here; the registry and provenance columns on
 * `emission_factors` keep every value traceable.
 */
export const EMISSION_FACTOR_DATASETS = {
  DEFRA_2026: 'DEFRA/DESNZ GHG conversion factors 2026 (IPCC AR5 GWP-100)',
  VECTO_2024: 'Regulation (EU) 2017/2400 VECTO simulation results (vehicle declared)',
  SUPPLIER: 'Supplier or customer declared figure',
} as const;

/** Units used by the calculation engine. */
export type EnergyUnit = 'L' | 'kg' | 'kWh';

export const FUEL_UNITS: Record<string, EnergyUnit | null> = {
  DIESEL: 'L',
  HVO: 'L',
  BIODIESEL: 'L',
  GASOLINE: 'L',
  LPG: 'L',
  CNG: 'kg',
  LNG: 'kg',
  ELECTRIC: 'kWh',
  HYDROGEN_FCEV: 'kg',
  HYDROGEN_ICE: 'kg',
  HYBRID_DIESEL: 'L',
  HYBRID_GASOLINE: 'L',
  OTHER: null,
};

export function unitForFuel(fuelType: string | null | undefined): EnergyUnit | null {
  if (!fuelType) return null;
  return FUEL_UNITS[String(fuelType).toUpperCase()] ?? null;
}
