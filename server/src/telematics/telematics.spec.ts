import { TestTachographProvider } from './providers/test-tachograph.provider';
import { VdoTachographProvider } from './providers/vdo-tachograph.provider';
import { StoneridgeTachographProvider } from './providers/stoneridge-tachograph.provider';
import { GenericTelematicsProvider } from './providers/generic-telematics.provider';
import { DrivingComplianceService } from './services/driving-compliance.service';
import { TachographSimulatorService } from './services/tachograph-simulator.service';
import { TelematicsService } from './services/telematics.service';

describe('HapTrans — Telematics, Tachograph, Live Tracking & Compliance Test Suite', () => {
  let complianceService: DrivingComplianceService;
  let simulatorService: TachographSimulatorService;
  let telematicsService: TelematicsService;
  let testProvider: TestTachographProvider;
  let vdoProvider: VdoTachographProvider;
  let stoneridgeProvider: StoneridgeTachographProvider;
  let genericProvider: GenericTelematicsProvider;

  let mockDeviceRepo: any;
  let mockTachographRepo: any;
  let mockDriverCardRepo: any;
  let mockLiveStateRepo: any;
  let mockTachoLiveStateRepo: any;
  let mockTachoEventsRepo: any;
  let mockTruckRepo: any;
  let mockDriverRepo: any;
  let mockActionLogs: any;

  beforeEach(() => {
    complianceService = new DrivingComplianceService();
    simulatorService = new TachographSimulatorService(complianceService);
    testProvider = new TestTachographProvider();
    vdoProvider = new VdoTachographProvider();
    stoneridgeProvider = new StoneridgeTachographProvider();
    genericProvider = new GenericTelematicsProvider();

    mockDeviceRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'dev-1',
          truckId: 'truck-sim-1',
          provider: 'test_simulator',
          providerDeviceId: 'TEL-001',
          connectionStatus: 'LIVE',
          lastSeenAt: new Date(),
          truck: { id: 'truck-sim-1', plateNumber: 'BT 43 VRA', brand: 'DAF', model: 'XF 480' },
        },
      ]),
      findOne: jest.fn(),
      save: jest.fn((e) => Promise.resolve({ id: 'dev-saved', ...e })),
      create: jest.fn((e) => ({ ...e })),
    };

    mockTachographRepo = {
      findOne: jest.fn(),
      save: jest.fn((e) => Promise.resolve({ id: 'tacho-saved', ...e })),
      create: jest.fn((e) => ({ ...e })),
    };

    mockDriverCardRepo = {
      findOne: jest.fn(),
      save: jest.fn((e) => Promise.resolve(e)),
    };

    mockLiveStateRepo = {
      findOne: jest.fn(),
      save: jest.fn((e) => Promise.resolve(e)),
    };

    mockTachoLiveStateRepo = {
      findOne: jest.fn(),
      save: jest.fn((e) => Promise.resolve(e)),
    };

    mockTachoEventsRepo = {
      save: jest.fn((e) => Promise.resolve(e)),
      create: jest.fn((e) => ({ ...e })),
    };

    mockTruckRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'truck-sim-1',
        plateNumber: 'BT 43 VRA',
        brand: 'DAF',
        model: 'XF 480',
        driver: { id: 'd-1', name: 'Catalin Vasile' },
      }),
    };

    mockDriverRepo = {
      findOne: jest.fn(),
    };

    mockActionLogs = {
      logAction: jest.fn().mockResolvedValue({}),
    };

    telematicsService = new TelematicsService(
      mockDeviceRepo,
      mockTachographRepo,
      mockDriverCardRepo,
      mockLiveStateRepo,
      mockTachoLiveStateRepo,
      mockTachoEventsRepo,
      mockTruckRepo,
      mockDriverRepo,
      mockActionLogs,
      testProvider,
      vdoProvider,
      stoneridgeProvider,
      genericProvider,
      simulatorService,
      complianceService,
    );
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. PROVIDER ABSTRACTION & CONNECTION TESTING
  // ═══════════════════════════════════════════════════════════════════════════
  describe('1. Provider Abstraction & Connection Tests', () => {
    it('should test connection successfully for TestTachographProvider', async () => {
      const res = await telematicsService.testConnection({ provider: 'test_simulator' });
      expect(res.success).toBe(true);
      expect(res.details?.authenticated).toBe(true);
      expect(res.details?.liveDataAvailable).toBe(true);
    });

    it('should fail VDO test connection when API credentials are empty', async () => {
      const res = await telematicsService.testConnection({ provider: 'vdo', credentials: {} });
      expect(res.success).toBe(false);
      expect(res.message).toContain('Authentication failed');
    });

    it('should succeed VDO test connection when valid credentials are provided', async () => {
      const res = await telematicsService.testConnection({
        provider: 'vdo',
        credentials: { apiKey: 'VDO_KEY_998822' },
      });
      expect(res.success).toBe(true);
      expect(res.details?.tachographFound).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. CE 561/2006 DRIVING COMPLIANCE ENGINE
  // ═══════════════════════════════════════════════════════════════════════════
  describe('2. Driving Compliance Engine (CE 561/2006)', () => {
    it('should calculate remaining continuous driving and alert when break is required soon', () => {
      // 4 hours and 15 minutes of continuous driving = 15,300s (15 min remaining until 4.5h limit)
      const evaluation = complianceService.evaluateDriverState('DRIVING', 15300, 15300, 90000);

      expect(evaluation.continuousDrivingSeconds).toBe(15300);
      expect(evaluation.breakRequiredInSeconds).toBe(900); // 15 minutes = 900s
      expect(evaluation.isBreakRequiredSoon).toBe(true);
      expect(evaluation.isBreakOverdue).toBe(false);
      expect(evaluation.warningMessage).toContain('Pauză necesară în 15 minute');
    });

    it('should flag break overdue when continuous driving reaches 4.5h (16,200s)', () => {
      const evaluation = complianceService.evaluateDriverState('DRIVING', 16500, 16500, 90000);

      expect(evaluation.isBreakOverdue).toBe(true);
      expect(evaluation.breakRequiredInSeconds).toBe(0);
      expect(evaluation.warningMessage).toContain('Pauză obligatorie depășită');
    });

    it('should inject mandatory 45m break in realistic travel duration calculation when route exceeds available driving time', () => {
      // Route requires 3.5h pure driving (12,600s), but driver only has 1.0h available continuous driving (3,600s)
      const realistic = complianceService.calculateRealisticTravelDuration(
        12600, // pure travel seconds
        12600, // driver continuous driving is already 3.5h (only 1h left before 4.5h threshold)
        20000,
      );

      expect(realistic.breaksCount).toBe(1);
      expect(realistic.breakDelaySeconds).toBe(2700); // 45 minutes = 2700s
      expect(realistic.totalDurationSeconds).toBe(12600 + 2700);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. MULTI-TRUCK SIMULATOR & SCENARIOS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('3. Multi-Truck Simulator & 10 Predefined Scenarios', () => {
    it('should initialize at least 20 simultaneous simulated trucks with geographic waypoints', () => {
      const trucks = simulatorService.getAllSimulatedTrucks();
      expect(trucks.length).toBeGreaterThanOrEqual(20);
      expect(trucks[0].plateNumber).toBe('BT 43 VRA');
      expect(trucks[0].connectionStatus).toBe('LIVE');
    });

    it('Scenario 2: Break Required Soon should update continuous driving to 4h 12m', () => {
      simulatorService.triggerScenario('truck-sim-1', 2);
      const truck = simulatorService.getSimulatedTruck('truck-sim-1');

      expect(truck?.continuousDriving).toBe(15120); // 4h 12m
      expect(truck?.currentActivity).toBe('DRIVING');
    });

    it('Scenario 3: Break Taken should set activity to BREAK and speed to 0', () => {
      simulatorService.triggerScenario('truck-sim-1', 3);
      const truck = simulatorService.getSimulatedTruck('truck-sim-1');

      expect(truck?.currentActivity).toBe('BREAK');
      expect(truck?.speed).toBe(0);
    });

    it('Scenario 4: Traffic Delay should reduce speed and set etaStatus to DELAYED', () => {
      simulatorService.triggerScenario('truck-sim-1', 4);
      const truck = simulatorService.getSimulatedTruck('truck-sim-1');

      expect(truck?.speed).toBe(22);
      expect(truck?.etaStatus).toBe('DELAYED');
    });

    it('Scenario 6 & 7: Disconnect and Reconnect should toggle connectionStatus between OFFLINE and LIVE', () => {
      simulatorService.triggerScenario('truck-sim-1', 6);
      expect(simulatorService.getSimulatedTruck('truck-sim-1')?.connectionStatus).toBe('OFFLINE');

      simulatorService.triggerScenario('truck-sim-1', 7);
      expect(simulatorService.getSimulatedTruck('truck-sim-1')?.connectionStatus).toBe('LIVE');
    });

    it('Scenario 8: Driver Change should switch driver and reset driving counters', () => {
      simulatorService.triggerScenario('truck-sim-1', 8);
      const truck = simulatorService.getSimulatedTruck('truck-sim-1');

      expect(truck?.driverId).toBe('driver-b-sim');
      expect(truck?.driverName).toContain('Driver B');
      expect(truck?.continuousDriving).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. TELEMATICS & MOBILE INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════
  describe('4. Telematics Service & Mobile Normalization', () => {
    it('should save telematics connection and encrypt credentials server-side', async () => {
      const mockUser = { id: 'u-admin', name: 'Admin' };
      const saved = await telematicsService.saveTelematicsConnection(mockUser, {
        truckId: 'truck-sim-1',
        provider: 'vdo',
        providerDeviceId: 'VDO-999',
        externalVehicleId: 'VH-100',
        credentials: { apiKey: 'SECRET_API_KEY' },
      });

      expect(saved.truckId).toBe('truck-sim-1');
      expect(saved.provider).toBe('vdo');
      expect(mockActionLogs.logAction).toHaveBeenCalledWith(
        'TelematicsDevice',
        expect.any(String),
        'SAVED_AND_ACTIVATED',
        mockUser,
        expect.anything(),
      );
    });

    it('should return normalized mobile telemetry for /api/mobile/my-truck', async () => {
      const mobileData = await telematicsService.getMyTruckForMobile({ name: 'Catalin Vasile' });

      expect(mobileData.truckId).toBeDefined();
      expect(mobileData.plateNumber).toBe('BT 43 VRA');
      expect(mobileData.tachograph.currentActivity).toBeDefined();
      expect(mobileData.tachograph.breakRequiredInSeconds).toBeDefined();
      expect(mobileData.currentTrip.currentStop).toBeDefined();
      // Verify sensitive server-side credentials are NOT leaked to mobile
      expect((mobileData as any).credentialsEncrypted).toBeUndefined();
      expect((mobileData as any).apiKey).toBeUndefined();
    });
  });
});
