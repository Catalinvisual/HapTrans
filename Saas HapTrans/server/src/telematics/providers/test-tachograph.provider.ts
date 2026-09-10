import { Injectable } from '@nestjs/common';
import {
  TachographProvider,
  ProviderConfig,
  ConnectionTestResult,
  NormalizedGpsData,
  NormalizedTachographData,
  NormalizedDriverCardData,
} from '../interfaces/tachograph-provider.interface';

@Injectable()
export class TestTachographProvider implements TachographProvider {
  readonly providerId = 'test_simulator';

  async connect(config: ProviderConfig): Promise<boolean> {
    return true;
  }

  async disconnect(deviceId: string): Promise<boolean> {
    return true;
  }

  async testConnection(config: ProviderConfig): Promise<ConnectionTestResult> {
    // Simulator connection is always valid unless deliberately set to error mode
    if (config.providerDeviceId === 'SIM-ERROR-TRIGGER') {
      return {
        success: false,
        message: 'Provider connection failed. Simulated hardware unreachable.',
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
      message: 'Connection successful. Simulated CAN-bus and Smart Tachograph active.',
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
      latitude: 51.5074,
      longitude: 5.3878,
      speed: 82.0,
      heading: 185.0,
      odometer: 428950.0,
      country: 'NL',
      timestamp: new Date(),
    };
  }

  async getLiveTachographData(deviceId: string): Promise<NormalizedTachographData> {
    return {
      currentActivity: 'DRIVING',
      drivingTimeToday: 8100, // 2h 15m
      drivingTimeRemaining: 24300, // 6h 45m remaining
      weeklyDrivingTime: 102600, // 28h 30m
      weeklyDrivingTimeRemaining: 99000,
      breakTime: 0,
      breakRequiredIn: 8100, // 2h 15m until 4.5h threshold
      dailyRestRemaining: 39600,
      workingTime: 1800,
      availabilityTime: 0,
      restTime: 0,
      timestamp: new Date(),
    };
  }

  async getDriverCard(driverId: string): Promise<NormalizedDriverCardData> {
    return {
      driverId,
      cardNumber: 'E123456789000100',
      driverName: 'Test Driver',
      cardIssuer: 'RDW Netherlands',
      expiryDate: '2029-12-31',
      status: 'valid',
    };
  }
}
