import { LatLng } from './routing-provider.interface';

export interface TollSection {
  countryCode: string;
  tollRoadName: string;
  cost: number;
  currency: string;
  distanceKm: number;
}

export interface TollCalculationVehicle {
  grossWeightKg?: number;
  axleCount?: number;
  heightCm?: number;
  emissionClass?: string; // 'Euro 6', 'Euro 5', etc.
  hasTrailer?: boolean;
}

export interface TollCalculationResult {
  available: boolean;
  provider: string; // 'here' | 'european_toll_matrix' | 'none'
  message?: string;
  totalCost: number;
  currency: string;
  countries: string[];
  sections: TollSection[];
  calculatedAt: Date;
}

export interface ITollProvider {
  name: string;
  isAvailable(): boolean;
  calculateTolls(
    origin: LatLng,
    destination: LatLng,
    waypoints?: LatLng[],
    vehicle?: TollCalculationVehicle,
  ): Promise<TollCalculationResult>;
}
