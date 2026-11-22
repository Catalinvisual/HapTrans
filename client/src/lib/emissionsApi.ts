import api from './api';

/** Typed access to the CO2 & Environmental Management API. */
export interface EmissionFiltersState {
  from?: string;
  to?: string;
  country?: string;
  truckId?: string;
  driverId?: string;
  customerId?: string;
  fuelType?: string;
  methodology?: string;
  lifecycle?: string;
  fleetType?: string;
  finalized?: string;
  boundary?: 'ttw' | 'wtt' | 'wtw';
}

export interface EmissionKpis {
  totalCo2eKg: number;
  ttwKg: number;
  wttKg: number;
  wtwKg: number;
  distanceKm: number;
  loadedKm: number;
  emptyKm: number;
  energyQuantity: number;
  gPerKm: number | null;
  gPerTonneKm: number | null;
  trips: number;
  verifiedTrips: number;
  estimatedTrips: number;
  pendingTrips: number;
  finalizedTrips: number;
  actualQualityTrips: number;
  reconciliationTrips: number;
  missingDataPercent: number | null;
  emptyRunningPercent: number | null;
  ownFleetKg: number;
  subcontractorKg: number;
  hasWtt: boolean;
}

export interface EmissionOverview {
  period: { from: string | null; to: string | null };
  boundary: string;
  kpis: EmissionKpis;
  series: {
    daily: Array<{ date: string; wtwKg: number; ttwKg: number; distanceKm: number; trips: number }>;
    monthly: Array<{ month: string; wtwKg: number; ttwKg: number; distanceKm: number; trips: number }>;
  };
  byCountry: Array<{ countryCode: string; distanceKm: number; loadedKm: number; emptyKm: number; ttwKg: number; wttKg: number; wtwKg: number; energyQuantity: number; trips: number }>;
  byTruck: Array<{ id: string; label: string; wtwKg: number; distanceKm: number; emptyKm: number; trips: number }>;
  byDriver: Array<{ id: string; label: string; wtwKg: number; distanceKm: number; emptyKm: number; trips: number }>;
  byCustomer: Array<{ id: string; label: string; wtwKg: number; ttwKg: number; distanceKm: number; trips: number }>;
  byFuelType: Array<{ fuelType: string; wtwKg: number; ttwKg: number; energyQuantity: number; trips: number }>;
  byLifecycle: Array<{ lifecycle: string; count: number; wtwKg: number }>;
  byMethodology: Array<{ methodology: string; count: number; wtwKg: number }>;
  loadedVsEmpty: { loadedKm: number; emptyKm: number };
  generatedAt: string;
}

export interface TripEmissionRow {
  id: string;
  tripId: string;
  tripNumber: string | null;
  plateNumber: string | null;
  executionDate: string | null;
  lifecycle: string;
  dataQuality: string;
  methodology: string;
  distanceKm: number;
  loadedKm: number;
  emptyKm: number;
  ttwKg: number | null;
  wttKg: number | null;
  wtwKg: number | null;
  energyQuantity: number | null;
  fuelType: string | null;
  fleetType: string;
  gPerTonneKm: number | null;
  reconciliation: any;
}

export interface EmissionSegment {
  id: string;
  sequence: number;
  countryCode: string;
  method: string;
  distanceKm: number;
  loadedKm: number;
  emptyKm: number;
  energyQuantity: number | null;
  ttwKgCo2e: number | null;
  wttKgCo2e: number | null;
  wtwKgCo2e: number | null;
  dataQuality: string;
  notes: string | null;
}

export interface EmissionAllocation {
  id: string;
  orderId: string | null;
  clientId: string | null;
  clientName: string | null;
  basis: string;
  sharePercent: number;
  distanceKm: number | null;
  payloadTonnes: number | null;
  ttwKgCo2e: number | null;
  wttKgCo2e: number | null;
  wtwKgCo2e: number | null;
  dataQuality: string;
}

export interface TripEmissionRecord {
  id: string;
  tripId: string;
  lifecycle: string;
  methodology: string;
  dataQuality: string;
  energySource: string;
  fuelType: string | null;
  energyUnit: string | null;
  distanceKm: number;
  loadedKm: number;
  emptyKm: number;
  energyQuantity: number | null;
  ttwKgCo2e: number | null;
  wttKgCo2e: number | null;
  wtwKgCo2e: number | null;
  gPerKm: number | null;
  gPerTonneKm: number | null;
  payloadTonnes: number | null;
  tonneKm: number | null;
  segmentDistanceKm: number | null;
  reconciliation: any;
  qualityFlags: string[] | null;
  engineVersion: string;
  inputHash: string | null;
  calculationCount: number;
  isFinalized: boolean;
  calculatedAt: string;
  executionDate: string | null;
  segments: EmissionSegment[];
  allocations: EmissionAllocation[];
  trip?: any;
}

export interface EmissionCountry {
  id: string;
  code: string;
  iso3: string;
  name: string;
  names: Record<string, string>;
  currency: string;
  euMember: boolean;
  region: string;
  roadChargingSystem: string | null;
  roadChargingBasis: string;
  co2ClassStatus: string;
  euroClassBasis: boolean | null;
  chargingOperator: string | null;
  chargingNotes: string | null;
  verificationStatus: string;
  lastVerifiedAt: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  version: string;
}

export interface RegulatorySource {
  id: string;
  code: string;
  jurisdiction: string;
  name: string;
  officialUrl: string;
  reportingScopes: string[] | null;
  effectiveDate: string | null;
  applicationDate: string | null;
  replacementDate: string | null;
  lastVerifiedAt: string | null;
  nextReviewAt: string | null;
  version: string;
  requirements: string;
  verificationStatus: string;
}

export interface EmissionFactorRecord {
  id: string;
  code: string;
  fuelType: string;
  energyUnit: string;
  geographicScope: string;
  ttwKgCo2ePerUnit: number | null;
  wttKgCo2ePerUnit: number | null;
  datasetVersion: string;
  source: string;
  sourceUrl: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  verificationStatus: string;
  applicabilityNote: string | null;
  activityType: string;
}

export interface ProfileListItem {
  truck: {
    id: string; plateNumber: string; brand: string; model: string; vin: string | null;
    year: number | null; euronorm: string | null; fuelType: string | null; axleCount: number | null;
    maxWeightKg: number | null; fuelConsumption: number | null; registrationCountry: string | null; status: string;
  };
  profile: any | null;
}

export interface EmissionReportRecord {
  id: string;
  reportNumber: string;
  kind: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  engineVersion: string;
  methodology: string;
  totals: any;
  snapshot: any;
  totalWtwKgCo2e: number | null;
  checksum: string | null;
  createdAt: string;
  finalizedAt: string | null;
}

export const emissionsApi = {
  overview: (filters: EmissionFiltersState, signal?: AbortSignal) =>
    api.get<EmissionOverview>('/emissions/overview', { params: filters, signal }).then((r) => r.data),
  filterOptions: () =>
    api.get('/emissions/filters/options').then((r) => r.data),
  tripRows: (filters: EmissionFiltersState & { limit?: number }) =>
    api.get<TripEmissionRow[]>('/emissions/trips', { params: filters }).then((r) => r.data),
  tripRecord: (tripId: string) =>
    api.get<TripEmissionRecord | null>(`/emissions/trips/${tripId}`).then((r) => r.data),
  calculateTrip: (tripId: string, body: any) =>
    api.post(`/emissions/trips/${tripId}/calculate`, body).then((r) => r.data),
  finalizeRecord: (id: string, body: any) =>
    api.post(`/emissions/records/${id}/finalize`, body).then((r) => r.data),
  recordHistory: (id: string) =>
    api.get(`/emissions/records/${id}/history`).then((r) => r.data),
  profiles: () =>
    api.get<ProfileListItem[]>('/emissions/profiles').then((r) => r.data),
  profile: (truckId: string) =>
    api.get(`/emissions/profiles/${truckId}`).then((r) => r.data),
  saveProfile: (truckId: string, body: any) =>
    api.put(`/emissions/profiles/${truckId}`, body).then((r) => r.data),
  verifyProfile: (truckId: string, reason: string) =>
    api.post(`/emissions/profiles/${truckId}/verify`, { reason }).then((r) => r.data),
  profileVersions: (truckId: string) =>
    api.get(`/emissions/profiles/${truckId}/versions`).then((r) => r.data),
  addDocument: (truckId: string, body: any) =>
    api.post(`/emissions/profiles/${truckId}/documents`, body).then((r) => r.data),
  removeDocument: (documentId: string) =>
    api.delete(`/emissions/profiles/documents/${documentId}`).then((r) => r.data),
  countries: (lang: string) =>
    api.get<EmissionCountry[]>('/emissions/countries', { params: { lang } }).then((r) => r.data),
  country: (code: string, lang: string) =>
    api.get(`/emissions/countries/${code}`, { params: { lang } }).then((r) => r.data),
  roadCharging: (country?: string) =>
    api.get('/emissions/road-charging', { params: { country } }).then((r) => r.data),
  classify: (truckId: string) =>
    api.get(`/emissions/road-charging/classify/${truckId}`).then((r) => r.data),
  factors: () =>
    api.get<EmissionFactorRecord[]>('/emissions/factors').then((r) => r.data),
  regulatorySources: () =>
    api.get<RegulatorySource[]>('/emissions/regulatory-sources').then((r) => r.data),
  regulatoryDue: () =>
    api.get<RegulatorySource[]>('/emissions/regulatory-sources/due').then((r) => r.data),
  calculate: (body: any) =>
    api.post('/emissions/calculator', body).then((r) => r.data),
  compare: (scenarios: any[]) =>
    api.post('/emissions/calculator/compare', { scenarios }).then((r) => r.data),
  saveSimulation: (input: any, result: any) =>
    api.post('/emissions/calculator/save', { input, result }).then((r) => r.data),
  simulations: () =>
    api.get('/emissions/calculator/simulations').then((r) => r.data),
  reports: (params: any = {}) =>
    api.get<EmissionReportRecord[]>('/emissions/reports', { params }).then((r) => r.data),
  generateReport: (body: any) =>
    api.post('/emissions/reports', body).then((r) => r.data),
  report: (id: string) =>
    api.get<EmissionReportRecord>(`/emissions/reports/${id}`).then((r) => r.data),
  finalizeReport: (id: string, reason?: string) =>
    api.post(`/emissions/reports/${id}/finalize`, { reason }).then((r) => r.data),
  auditRuns: (params: any = {}) =>
    api.get('/emissions/audit/runs', { params }).then((r) => r.data),
  reproduce: (id: string) =>
    api.get(`/emissions/audit/runs/${id}/reproduce`).then((r) => r.data),
  integrity: () =>
    api.get('/emissions/audit/integrity').then((r) => r.data),
  fuel: (params: any = {}) =>
    api.get('/emissions/fuel', { params }).then((r) => r.data),
  fuelSummary: () =>
    api.get('/emissions/fuel/summary').then((r) => r.data),
  importFuel: (rows: any[]) =>
    api.post('/emissions/fuel/import', { rows }).then((r) => r.data),
  integrations: () =>
    api.get('/emissions/integrations').then((r) => r.data),
  settings: () =>
    api.get('/emissions/settings').then((r) => r.data),
  saveSettings: (body: any) =>
    api.put('/emissions/settings', body).then((r) => r.data),
  downloadReport: (id: string, format: 'csv' | 'xlsx') =>
    api.get(`/emissions/reports/${id}/${format}`, { responseType: 'blob' }).then((r) => r.data),
};

export default emissionsApi;
