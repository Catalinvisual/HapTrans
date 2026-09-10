export interface ProviderConfig {
  provider: string;
  providerDeviceId?: string;
  externalVehicleId?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  credentials?: Record<string, any>;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: {
    authenticated: boolean;
    deviceFound: boolean;
    vehicleFound: boolean;
    tachographFound: boolean;
    driverDataAvailable: boolean;
    liveDataAvailable: boolean;
  };
  rawError?: string;
}

export interface NormalizedGpsData {
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  odometer: number;
  country: string;
  timestamp: Date;
}

export interface NormalizedTachographData {
  currentActivity: string;
  drivingTimeToday: number; // in seconds
  drivingTimeRemaining: number; // in seconds
  weeklyDrivingTime: number; // in seconds
  weeklyDrivingTimeRemaining: number; // in seconds
  breakTime: number; // in seconds
  breakRequiredIn: number; // in seconds
  dailyRestRemaining: number; // in seconds
  workingTime: number;
  availabilityTime: number;
  restTime: number;
  timestamp: Date;
}

export interface NormalizedDriverCardData {
  driverId?: string;
  cardNumber: string;
  driverName?: string;
  cardIssuer: string;
  expiryDate?: string;
  status: string;
}

export interface TachographProvider {
  readonly providerId: string;
  connect(config: ProviderConfig): Promise<boolean>;
  disconnect(deviceId: string): Promise<boolean>;
  testConnection(config: ProviderConfig): Promise<ConnectionTestResult>;
  getLivePosition(deviceId: string): Promise<NormalizedGpsData>;
  getLiveTachographData(deviceId: string): Promise<NormalizedTachographData>;
  getDriverCard?(driverId: string): Promise<NormalizedDriverCardData>;
}
