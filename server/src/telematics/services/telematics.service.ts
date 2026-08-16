import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelematicsDevice, TelematicsConnectionStatus, TelematicsProviderType } from '../entities/telematics-device.entity';
import { Tachograph } from '../entities/tachograph.entity';
import { DriverTachographCard } from '../entities/driver-tachograph-card.entity';
import { VehicleLiveState, EtaStatus } from '../entities/vehicle-live-state.entity';
import { TachographLiveState } from '../entities/tachograph-live-state.entity';
import { TachographActivityEvent } from '../entities/tachograph-activity-event.entity';
import { Truck } from '../../trucks/truck.entity';
import { Driver } from '../../drivers/driver.entity';
import { ActionLogsService } from '../../action-logs/action-logs.service';
import { TestTachographProvider } from '../providers/test-tachograph.provider';
import { VdoTachographProvider } from '../providers/vdo-tachograph.provider';
import { StoneridgeTachographProvider } from '../providers/stoneridge-tachograph.provider';
import { GenericTelematicsProvider } from '../providers/generic-telematics.provider';
import { TachographSimulatorService } from './tachograph-simulator.service';
import { DrivingComplianceService } from './driving-compliance.service';
import { ConnectionTestResult, ProviderConfig } from '../interfaces/tachograph-provider.interface';

@Injectable()
export class TelematicsService {
  private readonly logger = new Logger(TelematicsService.name);

  constructor(
    @InjectRepository(TelematicsDevice) private deviceRepo: Repository<TelematicsDevice>,
    @InjectRepository(Tachograph) private tachographRepo: Repository<Tachograph>,
    @InjectRepository(DriverTachographCard) private driverCardRepo: Repository<DriverTachographCard>,
    @InjectRepository(VehicleLiveState) private liveStateRepo: Repository<VehicleLiveState>,
    @InjectRepository(TachographLiveState) private tachoLiveStateRepo: Repository<TachographLiveState>,
    @InjectRepository(TachographActivityEvent) private tachoEventsRepo: Repository<TachographActivityEvent>,
    @InjectRepository(Truck) private truckRepo: Repository<Truck>,
    @InjectRepository(Driver) private driverRepo: Repository<Driver>,
    private actionLogs: ActionLogsService,
    private testProvider: TestTachographProvider,
    private vdoProvider: VdoTachographProvider,
    private stoneridgeProvider: StoneridgeTachographProvider,
    private genericProvider: GenericTelematicsProvider,
    private simulatorService: TachographSimulatorService,
    private complianceService: DrivingComplianceService,
  ) {}

  private getProviderAdapter(provider: string) {
    switch (provider?.toLowerCase()) {
      case 'vdo':
        return this.vdoProvider;
      case 'stoneridge':
        return this.stoneridgeProvider;
      case 'generic':
        return this.genericProvider;
      case 'test_simulator':
      default:
        return this.testProvider;
    }
  }

  // 1. Connection Test
  async testConnection(config: ProviderConfig): Promise<ConnectionTestResult> {
    const adapter = this.getProviderAdapter(config.provider);
    return adapter.testConnection(config);
  }

  // 2. Devices Overview (Fleet -> Telematics)
  async getAllTelematicsConnections() {
    try {
      let devices: TelematicsDevice[] = [];
      try {
        devices = await this.deviceRepo.find({
          relations: ['truck'],
          order: { updatedAt: 'DESC' },
        });
      } catch (err: any) {
        this.logger.warn('Could not query telematics_devices repository directly:', err?.message);
      }

      const simulatedList = this.simulatorService.getAllSimulatedTrucks();

      if (!devices || devices.length === 0) {
        // Return rich simulated fleet overview so the page is immediately populated and responsive
        return simulatedList.map((sim) => ({
          id: `dev-${sim.truckId}`,
          truckId: sim.truckId,
          truckPlate: sim.plateNumber,
          truckBrand: 'DAF',
          truckModel: 'XF 480',
          driverName: sim.driverName,
          provider: 'test_simulator',
          providerDeviceId: `TEL-${sim.plateNumber.replace(/\s+/g, '')}`,
          externalVehicleId: `VH-${sim.plateNumber.replace(/\s+/g, '')}`,
          connectionStatus: sim.connectionStatus,
          currentActivity: sim.currentActivity,
          latitude: sim.latitude,
          longitude: sim.longitude,
          speed: sim.speed,
          heading: sim.heading,
          odometer: sim.odometer,
          eta: sim.eta,
          etaStatus: sim.etaStatus,
          breakRequiredIn: Math.max(0, 16200 - sim.continuousDriving),
          lastSeenAt: new Date(),
          updatedAt: new Date(),
        }));
      }

      // Map each device to live summary
      return devices.map((d) => {
        const sim = simulatedList.find((s) => s.truckId === d.truckId || s.plateNumber === d.truck?.plateNumber);
        return {
          id: d.id,
          truckId: d.truckId,
          truckPlate: d.truck?.plateNumber || sim?.plateNumber || '—',
          truckBrand: d.truck?.brand || '—',
          truckModel: d.truck?.model || '—',
          driverName: sim?.driverName || (d.truck as any)?.driver?.user?.name || '—',
          provider: d.provider,
          providerDeviceId: d.providerDeviceId || 'TEL-001',
          externalVehicleId: d.externalVehicleId || 'V-001',
          connectionStatus: sim?.connectionStatus || d.connectionStatus || TelematicsConnectionStatus.LIVE,
          currentActivity: sim?.currentActivity || 'DRIVING',
          latitude: sim?.latitude || d.lastLatitude || 51.5074,
          longitude: sim?.longitude || d.lastLongitude || 5.3878,
          speed: sim?.speed ?? d.lastSpeed ?? 82.0,
          heading: sim?.heading ?? d.lastHeading ?? 180,
          odometer: sim?.odometer ?? d.lastOdometer ?? 428000,
          eta: sim?.eta || null,
          etaStatus: sim?.etaStatus || 'ON_TIME',
          breakRequiredIn: sim ? Math.max(0, 16200 - sim.continuousDriving) : 7200,
          lastSeenAt: d.lastSeenAt || new Date(),
          updatedAt: d.updatedAt,
        };
      });
    } catch (e) {
      this.logger.error('Error in getAllTelematicsConnections:', e);
      return [];
    }
  }

  // 3. Create or Update Telematics Connection (Wizard)
  async saveTelematicsConnection(user: any, dto: {
    truckId: string;
    provider: string;
    providerDeviceId?: string;
    externalVehicleId?: string;
    deviceType?: string;
    tachographBrand?: string;
    tachographModel?: string;
    tachographSerial?: string;
    tachographGeneration?: string;
    credentials?: Record<string, any>;
  }) {
    let device = await this.deviceRepo.findOne({ where: { truckId: dto.truckId } });
    if (!device) {
      device = this.deviceRepo.create({
        truckId: dto.truckId,
        provider: dto.provider || TelematicsProviderType.TEST_SIMULATOR,
        providerDeviceId: dto.providerDeviceId,
        externalVehicleId: dto.externalVehicleId,
        deviceType: dto.deviceType || 'OBD_FMS',
        connectionStatus: TelematicsConnectionStatus.LIVE,
        credentialsEncrypted: dto.credentials ? Buffer.from(JSON.stringify(dto.credentials)).toString('base64') : undefined,
        lastSeenAt: new Date(),
      });
    } else {
      device.provider = dto.provider || device.provider;
      device.providerDeviceId = dto.providerDeviceId || device.providerDeviceId;
      device.externalVehicleId = dto.externalVehicleId || device.externalVehicleId;
      device.deviceType = dto.deviceType || device.deviceType;
      device.connectionStatus = TelematicsConnectionStatus.LIVE;
      if (dto.credentials) {
        device.credentialsEncrypted = Buffer.from(JSON.stringify(dto.credentials)).toString('base64');
      }
      device.lastSeenAt = new Date();
    }

    const savedDevice = await this.deviceRepo.save(device);

    // Also update / create Tachograph
    let tachograph = await this.tachographRepo.findOne({ where: { truckId: dto.truckId } });
    if (!tachograph) {
      tachograph = this.tachographRepo.create({
        truckId: dto.truckId,
        telematicsDeviceId: savedDevice.id,
        provider: dto.provider || 'test_simulator',
        brand: dto.tachographBrand || 'VDO',
        model: dto.tachographModel || 'DTCO 4.1b',
        serialNumber: dto.tachographSerial || `TC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        generation: dto.tachographGeneration || 'GEN2_SMART_2',
        lastSyncAt: new Date(),
      });
    } else {
      tachograph.brand = dto.tachographBrand || tachograph.brand;
      tachograph.model = dto.tachographModel || tachograph.model;
      tachograph.serialNumber = dto.tachographSerial || tachograph.serialNumber;
      tachograph.generation = dto.tachographGeneration || tachograph.generation;
      tachograph.lastSyncAt = new Date();
    }
    await this.tachographRepo.save(tachograph);

    await this.actionLogs.logAction('TelematicsDevice', savedDevice.id, 'SAVED_AND_ACTIVATED', user, {
      truckId: dto.truckId,
      provider: dto.provider,
    });

    return savedDevice;
  }

  // 4. Truck-specific Telematics & Tachograph Details
  async getTruckTelematicsDetails(truckId: string) {
    const truck = await this.truckRepo.findOne({
      where: { id: truckId },
      relations: ['driver', 'driver.user'],
    });
    if (!truck) throw new NotFoundException('Truck not found');

    const device = await this.deviceRepo.findOne({ where: { truckId } });
    const tachograph = await this.tachographRepo.findOne({ where: { truckId } });
    const sim = this.simulatorService.getSimulatedTruck(truckId) ||
      this.simulatorService.getAllSimulatedTrucks().find((s) => s.plateNumber === truck.plateNumber);

    const compliance = this.complianceService.evaluateDriverState(
      sim?.currentActivity || 'DRIVING',
      sim?.drivingTimeToday || 7200,
      sim?.continuousDriving || 7200,
      sim?.weeklyDrivingTime || 90000,
    );

    const driverName = sim?.driverName || truck.driver?.user?.name || (truck.driver as any)?.name || '—';

    return {
      vehicle: {
        id: truck.id,
        plateNumber: truck.plateNumber,
        brand: truck.brand || 'DAF',
        model: truck.model || 'XF 480',
        currentDriver: driverName,
        currentTrip: sim?.tripNumber || 'TRP-2026-0042',
      },
      telematics: {
        id: device?.id || 'dev-sim',
        provider: device?.provider || 'test_simulator',
        deviceId: device?.providerDeviceId || 'TEL-001',
        externalVehicleId: device?.externalVehicleId || 'V-001',
        deviceType: device?.deviceType || 'OBD_FMS',
        connectionStatus: sim?.connectionStatus || device?.connectionStatus || TelematicsConnectionStatus.LIVE,
        lastSeenAt: device?.lastSeenAt || new Date(),
        latitude: sim?.latitude || device?.lastLatitude || 51.5074,
        longitude: sim?.longitude || device?.lastLongitude || 5.3878,
        speed: sim?.speed ?? device?.lastSpeed ?? 82.0,
        heading: sim?.heading ?? device?.lastHeading ?? 180,
        odometer: sim?.odometer ?? device?.lastOdometer ?? 428000,
      },
      tachograph: {
        id: tachograph?.id || 'tacho-sim',
        brand: tachograph?.brand || 'VDO',
        model: tachograph?.model || 'DTCO 4.1b',
        serialNumber: tachograph?.serialNumber || 'SN-99882211',
        firmwareVersion: tachograph?.firmwareVersion || 'v4.1.02',
        generation: tachograph?.generation || 'GEN2_SMART_2',
        lastSyncAt: tachograph?.lastSyncAt || new Date(),
      },
      driver: {
        name: driverName,
        cardNumber: 'E123456789000100',
        cardStatus: 'valid',
        currentActivity: sim?.currentActivity || 'DRIVING',
        compliance,
      },
    };
  }

  // 5. Fleet Tachograph Monitoring (Fleet -> Tachograph)
  async getFleetTachographOverview() {
    const simList = this.simulatorService.getAllSimulatedTrucks();
    return simList.map((sim) => {
      const compliance = this.complianceService.evaluateDriverState(
        sim.currentActivity,
        sim.drivingTimeToday,
        sim.continuousDriving,
        sim.weeklyDrivingTime,
      );

      return {
        truckId: sim.truckId,
        plateNumber: sim.plateNumber,
        driverId: sim.driverId,
        driverName: sim.driverName,
        currentActivity: sim.currentActivity,
        drivingTimeTodaySeconds: sim.drivingTimeToday,
        continuousDrivingSeconds: sim.continuousDriving,
        breakRequiredInSeconds: compliance.breakRequiredInSeconds,
        weeklyDrivingSeconds: sim.weeklyDrivingTime,
        dailyRestRemainingSeconds: compliance.dailyRestRemainingSeconds,
        speed: sim.speed,
        odometer: sim.odometer,
        connectionStatus: sim.connectionStatus,
        warning: compliance.warningMessage,
        isBreakRequiredSoon: compliance.isBreakRequiredSoon,
        eta: sim.eta,
        etaStatus: sim.etaStatus,
      };
    });
  }

  // 6. Mobile Driver App Endpoint: /api/mobile/my-truck
  async getMyTruckForMobile(user: any) {
    const simList = this.simulatorService.getAllSimulatedTrucks();
    // Match by driver user name or default to first truck
    const sim = simList.find((s) => s.driverName.toLowerCase().includes(user?.name?.toLowerCase() || '')) || simList[0];

    const compliance = this.complianceService.evaluateDriverState(
      sim.currentActivity,
      sim.drivingTimeToday,
      sim.continuousDriving,
      sim.weeklyDrivingTime,
    );

    return {
      truckId: sim.truckId,
      plateNumber: sim.plateNumber,
      driverName: sim.driverName,
      connectionStatus: sim.connectionStatus,
      currentTrip: {
        id: sim.tripId,
        tripNumber: sim.tripNumber,
        currentStop: 'Best Logistics, Rotterdam',
        nextStop: 'Paris Crossdock, Paris',
        eta: sim.eta,
        etaStatus: sim.etaStatus,
        distanceRemainingKm: Math.round(sim.distanceRemainingKm),
        routeProgress: Math.round(sim.routeProgress),
      },
      tachograph: {
        currentActivity: sim.currentActivity,
        drivingTimeTodaySeconds: sim.drivingTimeToday,
        drivingTimeRemainingSeconds: compliance.dailyDrivingRemainingSeconds,
        continuousDrivingSeconds: sim.continuousDriving,
        breakRequiredInSeconds: compliance.breakRequiredInSeconds,
        weeklyDrivingSeconds: sim.weeklyDrivingTime,
        speed: sim.speed,
        odometer: Math.round(sim.odometer),
        isBreakRequiredSoon: compliance.isBreakRequiredSoon,
        warningMessage: compliance.warningMessage,
        lastUpdate: new Date(),
      },
    };
  }
}
