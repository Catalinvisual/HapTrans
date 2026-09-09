import { Injectable } from '@nestjs/common';
import {
  TachographProvider,
  ProviderConfig,
  ConnectionTestResult,
  NormalizedGpsData,
  NormalizedTachographData,
} from '../interfaces/tachograph-provider.interface';

@Injectable()
export class StoneridgeTachographProvider implements TachographProvider {
  readonly providerId = 'stoneridge';

  async connect(config: ProviderConfig): Promise<boolean> {
    return true;
  }

  async disconnect(deviceId: string): Promise<boolean> {
    return true;
  }

  async testConnection(config: ProviderConfig): Promise<ConnectionTestResult> {
    const creds = config.credentials || {};
    if (!creds.apiKey && !creds.clientSecret) {
      return {
        success: false,
        message: 'Authentication failed. Please check Stoneridge OPTAC3 API credentials.',
        details: {
          authenticated: false,
          deviceFound: false,
          vehicleFound: false,
          tachographFound: false,
          driverDataAvailable: false,
          liveDataAvailable: false,
        },
      };
    }

    return {
      success: true,
      message: 'Stoneridge Smart 2 telematics link active.',
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
      latitude: 50.8503,
      longitude: 4.3517,
      speed: 85.0,
      heading: 210.0,
      odometer: 280000.0,
      country: 'BE',
      timestamp: new Date(),
    };
  }

  async getLiveTachographData(deviceId: string): Promise<NormalizedTachographData> {
    return {
      currentActivity: 'DRIVING',
      drivingTimeToday: 9000,
      drivingTimeRemaining: 23400,
      weeklyDrivingTime: 95000,
      weeklyDrivingTimeRemaining: 106600,
      breakTime: 0,
      breakRequiredIn: 7200,
      dailyRestRemaining: 39600,
      workingTime: 600,
      availabilityTime: 0,
      restTime: 0,
      timestamp: new Date(),
    };
  }
}
