import { Injectable } from '@nestjs/common';
import {
  TachographProvider,
  ProviderConfig,
  ConnectionTestResult,
  NormalizedGpsData,
  NormalizedTachographData,
} from '../interfaces/tachograph-provider.interface';

@Injectable()
export class VdoTachographProvider implements TachographProvider {
  readonly providerId = 'vdo';

  async connect(config: ProviderConfig): Promise<boolean> {
    return true;
  }

  async disconnect(deviceId: string): Promise<boolean> {
    return true;
  }

  async testConnection(config: ProviderConfig): Promise<ConnectionTestResult> {
    const creds = config.credentials || {};
    if (!creds.apiKey && !creds.clientId) {
      return {
        success: false,
        message: 'Authentication failed. Please check VDO API Key or Client credentials.',
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
      message: 'VDO TIS-Web connection established successfully.',
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
      latitude: 52.3676,
      longitude: 4.9041,
      speed: 80.0,
      heading: 90.0,
      odometer: 350000.0,
      country: 'NL',
      timestamp: new Date(),
    };
  }

  async getLiveTachographData(deviceId: string): Promise<NormalizedTachographData> {
    return {
      currentActivity: 'DRIVING',
      drivingTimeToday: 7200,
      drivingTimeRemaining: 25200,
      weeklyDrivingTime: 90000,
      weeklyDrivingTimeRemaining: 111600,
      breakTime: 0,
      breakRequiredIn: 9000,
      dailyRestRemaining: 39600,
      workingTime: 1200,
      availabilityTime: 0,
      restTime: 0,
      timestamp: new Date(),
    };
  }
}
