import { LatLng } from './routing-provider.interface';

export interface TrafficIncident {
  id: string;
  type: 'accident' | 'congestion' | 'roadwork' | 'closure' | 'weather' | 'other';
  severity: 'low' | 'moderate' | 'major' | 'critical';
  description: string;
  delayMinutes: number;
  location?: LatLng;
  roadName?: string;
  startTime?: Date;
  endTime?: Date;
}

export interface TrafficStatusResult {
  available: boolean;
  provider: string; // 'here' | 'google' | 'tomtom' | 'none'
  message?: string;
  currentDelayMinutes: number;
  congestionLevel: 'free_flow' | 'light' | 'moderate' | 'heavy' | 'standstill';
  estimatedDurationWithTrafficMin: number;
  normalDurationMin: number;
  incidents: TrafficIncident[];
  calculatedAt: Date;
}

export interface ITrafficProvider {
  name: string;
  isAvailable(): boolean;
  getTrafficAlongRoute(
    origin: LatLng,
    destination: LatLng,
    waypoints?: LatLng[],
  ): Promise<TrafficStatusResult>;
}
