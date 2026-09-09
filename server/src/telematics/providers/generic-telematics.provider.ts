import { Injectable } from '@nestjs/common';
import {
  TachographProvider,
  ProviderConfig,
  ConnectionTestResult,
  NormalizedGpsData,
  NormalizedTachographData,
} from '../interfaces/tachograph-provider.interface';

@Injectable()
export class GenericTelematicsProvider implements TachographProvider {
  readonly providerId = 'generic';

  async connect(config: ProviderConfig): Promise<boolean> {
    return true;
  }

  async disconnect(deviceId: string): Promise<boolean> {
    return true;
  }

  async testConnection(config: ProviderConfig): Promise<ConnectionTestResult> {
    return {
      success: true,
      message: 'Generic FMS OBD-II connection active.',
      details: {
        authenticated: true,
        deviceFound: true,
        vehicleFound: true,
        tachographFound: true,
        driverDataAvailable: true,
        liveDataAvailable: true,
      },
    };
  }

  async getLivePosition(deviceId: string): Promise<NormalizedGpsData> {
    return {
      latitude: 48.8566,
      longitude: 2.3522,
      speed: 78.0,
      heading: 140.0,
      odometer: 190000.0,
      country: 'FR',
      timestamp: new Date(),
    };
  }

  async getLiveTachographData(deviceId: string): Promise<NormalizedTachographData> {
    return {
      currentActivity: 'DRIVING',
      drivingTimeToday: 10800,
      drivingTimeRemaining: 21600,
      weeklyDrivingTime: 85000,
      weeklyDrivingTimeRemaining: 116600,
      breakTime: 0,
      breakRequiredIn: 5400,
      dailyRestRemaining: 39600,
      workingTime: 1800,
      availabilityTime: 0,
      restTime: 0,
      timestamp: new Date(),
    };
  }
}
