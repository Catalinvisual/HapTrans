export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteSummaryResult {
  distanceKm: number;
  durationMin: number;
  durationText: string;
  tollCost?: number;
  tollCurrency?: string;
  tollStatus?: 'calculated' | 'unavailable';
  polyline?: string | null;
  coordinates?: number[][];
  source: 'google' | 'here' | 'ors' | 'osm' | 'haversine_fallback';
}

export interface MatrixResult {
  distanceMatrix: number[][]; // in km
  timeMatrix: number[][]; // in minutes (driving time)
  source: 'google' | 'here' | 'ors' | 'osm' | 'cache' | 'haversine_fallback';
  cachedPairsCount?: number;
  calculatedPairsCount?: number;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
  placeId?: string;
  provider?: string;
}

export interface AutocompleteItem {
  id?: string;
  label: string;
}

export interface RoutingOptions {
  weightKg?: number;
  heightCm?: number;
  widthCm?: number;
  lengthCm?: number;
  axleCount?: number;
  emissionType?: number;
  avoidTolls?: boolean;
  avoidFerries?: boolean;
}

export interface IRoutingProvider {
  name: string;
  calculateRoute(origin: LatLng, destination: LatLng, options?: RoutingOptions): Promise<RouteSummaryResult | null>;
  calculateMatrix(points: LatLng[], options?: RoutingOptions): Promise<MatrixResult | null>;
  geocode(address: string): Promise<GeocodeResult | null>;
  autocomplete(query: string): Promise<AutocompleteItem[]>;
}
