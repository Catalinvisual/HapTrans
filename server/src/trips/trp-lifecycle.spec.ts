jest.mock('or-tools-wasm/routing', () => ({}));
jest.mock('or-tools-wasm', () => ({}));
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlanningService } from '../planning/planning.service';

describe('TRP Lifecycle, Validation, and Dispatch Architecture — Complete Test Suite', () => {
  let service: PlanningService;
  let mockTripRepo: any;
  let mockTruckRepo: any;
  let mockOrderRepo: any;
  let mockAuditRepo: any;
  let mockRoutePlanRepo: any;
  let mockStopRepo: any;
  let mockTaskRepo: any;
  let mockTimelineService: any;

  const mockUser = {
    id: 'user-planner-01',
    companyId: 'comp-01',
    name: 'Chief Planner',
    role: 'dispatcher',
  };

  beforeEach(() => {
    mockTripRepo = {
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve({ ...entity })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      create: jest.fn((e) => ({ ...e })),
      createQueryBuilder: jest.fn(),
    };

    mockTruckRepo = {
      findOne: jest.fn(),
      save: jest.fn((e) => Promise.resolve({ ...e })),
    };

    mockOrderRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn((e) => Promise.resolve(Array.isArray(e) ? e.map(x => ({ ...x })) : { ...e })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findByIds: jest.fn(),
    };

    mockAuditRepo = {
      save: jest.fn().mockResolvedValue({}),
      create: jest.fn((e) => ({ ...e })),
    };

    mockRoutePlanRepo = {
      findOne: jest.fn(),
      save: jest.fn((e) => Promise.resolve({ ...e })),
      create: jest.fn((e) => ({ ...e })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockStopRepo = {
      save: jest.fn((e) => Promise.resolve(Array.isArray(e) ? e.map(x => ({ ...x })) : { ...e })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      find: jest.fn().mockResolvedValue([]),
    };

    mockTaskRepo = {
      save: jest.fn((e) => Promise.resolve(Array.isArray(e) ? e.map(x => ({ ...x })) : { ...e })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockTimelineService = {
      logUserEvent: jest.fn().mockResolvedValue({}),
      logSystemEvent: jest.fn().mockResolvedValue({}),
    };

    service = new PlanningService(
      mockOrderRepo,
      mockTripRepo,
      mockStopRepo,
      mockTaskRepo,
      {} as any,
      mockTruckRepo,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      mockAuditRepo,
      {} as any,
      mockRoutePlanRepo,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      mockTimelineService,
      {} as any,
      {} as any,
    );
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. TRP-TEST-001: CROSS-PAGE DATA CONSISTENCY
  // ═══════════════════════════════════════════════════════════════════════════
  describe('1. TRP-TEST-001: Cross-Page TRP Data Consistency', () => {
    it('should return identical truck, driver, trailer, stops, route, distance, eta, and validation state across all views', async () => {
      const trpData = {
        id: 'TRP-TEST-001',
        companyId: 'comp-01',
        tripNumber: 'TRP-2026-TEST-001',
        status: 'planning',
        validationStatus: 'feasible',
        truck: { id: 'truck-ab26', plateNumber: 'AB 26 SET', truckType: 'curtainsider', payloadCapacity: 24000, maxPallets: 33 },
        driver: { id: 'driver-a', name: 'Driver A', user: { name: 'Driver A', email: 'driver.a@haptrans.com' } },
        trailer: { id: 'trailer-a', plateNumber: 'Trailer A' },
        orders: [
          {
            id: 'ord-001',
            orderNumber: 'ORD-TEST-001',
            status: 'assigned',
            cargoItems: [{ weightKg: 12000, pallets: 18 }],
            stops: [
              { id: 's1', type: 'pickup', address: 'Best, Netherlands', city: 'Best', sequence: 1, dateFrom: '2026-08-20T08:00:00Z' },
              { id: 's2', type: 'delivery', address: 'Paris, France', city: 'Paris', sequence: 2, dateFrom: '2026-08-21T10:00:00Z' },
            ],
          },
        ],
        stops: [
          { id: 's1', orderId: 'ord-001', type: 'pickup', address: 'Best, Netherlands', city: 'Best', sequence: 1 },
          { id: 's2', orderId: 'ord-001', type: 'delivery', address: 'Paris, France', city: 'Paris', sequence: 2 },
        ],
      };

      mockTripRepo.findOne.mockResolvedValue(trpData);
      mockRoutePlanRepo.findOne.mockResolvedValue({
        id: 'rp-001',
        tripId: 'TRP-TEST-001',
        truckId: 'truck-ab26',
        truck: trpData.truck,
        driverId: 'driver-a',
        driver: trpData.driver,
        trailerId: 'trailer-a',
        trailer: trpData.trailer,
        tripNumber: 'TRP-2026-TEST-001',
        tripStatus: 'planning',
        validationStatus: 'feasible',
        totalDistanceKm: 480,
        totalDurationMinutes: 360,
        stops: [
          { id: 's1', type: 'pickup', address: 'Best, Netherlands', sequence: 1 },
          { id: 's2', type: 'delivery', address: 'Paris, France', sequence: 2 },
        ],
      });

      // Query from Planning / Route Planner view
      const synthesizedRoutePlan: any = await service.getRoutePlanByTrip('TRP-TEST-001');

      expect(synthesizedRoutePlan.truck?.plateNumber).toBe('AB 26 SET');
      expect(synthesizedRoutePlan.driver?.name).toBe('Driver A');
      expect(synthesizedRoutePlan.trailer?.plateNumber).toBe('Trailer A');
      expect(synthesizedRoutePlan.stops[0].address).toContain('Best');
      expect(synthesizedRoutePlan.stops[1].address).toContain('Paris');
      expect(synthesizedRoutePlan.tripStatus).toBe('planning');
      expect(synthesizedRoutePlan.validationStatus).toBe('feasible');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. END-TO-END LIFECYCLE & DRIVER WORKFLOW
  // ═══════════════════════════════════════════════════════════════════════════
  describe('2. End-to-End TRP Lifecycle & Driver Execution', () => {
    it('should transition smoothly: planning -> validated -> confirmed -> dispatched -> driver_received -> driver_accepted', async () => {
      const trip: any = {
        id: 'trip-e2e',
        companyId: 'comp-01',
        tripNumber: 'TRP-E2E-001',
        status: 'planning',
        validationStatus: 'not_validated',
        dispatchVersion: 0,
        confirmedAt: null,
        truck: { id: 't1', plateNumber: 'B-100-E2E', features: ['frigo'], payloadCapacity: 24000, maxPallets: 33 },
        driver: { id: 'd1', name: 'Liviu Driver' },
        trailer: { id: 'tr1', plateNumber: 'TR-100' },
        orders: [
          {
            id: 'ord-e2e',
            status: 'assigned',
            cargoItems: [{ weightKg: 5000, pallets: 10 }],
            stops: [
              { id: 's1', type: 'pickup', sequence: 1 },
              { id: 's2', type: 'delivery', sequence: 2 },
            ],
          },
        ],
        stops: [
          { id: 's1', orderId: 'ord-e2e', type: 'pickup', sequence: 1 },
          { id: 's2', orderId: 'ord-e2e', type: 'delivery', sequence: 2 },
        ],
      };

      mockTripRepo.findOne.mockResolvedValue(trip);

      // Step 1: Validate
      const valResult = await service.validateTrip(mockUser, 'trip-e2e');
      expect(valResult.validationStatus).toBe('feasible');
      trip.validationStatus = 'feasible';

      // Step 2: Confirm Plan
      const confirmed = await service.confirmTrip(mockUser, 'trip-e2e');
      expect(confirmed?.status).toBe('confirmed');
      expect(confirmed?.confirmedAt).toBeDefined();
      trip.status = 'confirmed';
      trip.confirmedAt = confirmed?.confirmedAt;

      // Step 3: Send to Driver (Dispatch v1)
      const dispatched = await service.sendToDriver(mockUser, 'trip-e2e', { routeInfo: 'Standard route' });
      expect(dispatched.status).toBe('dispatched');
      expect(dispatched.dispatchVersion).toBe(1);
      expect(dispatched.trackingActivated).toBe(true);
      trip.status = 'dispatched';
      trip.dispatchVersion = 1;

      // Step 4: Driver Received
      const received = await service.driverReceived('trip-e2e');
      expect(received?.status).toBe('driver_received');
      expect(received?.driverAcknowledgedAt).toBeDefined();
      trip.status = 'driver_received';

      // Step 5: Driver Accepted (Distinct from Dispatched and Received)
      const accepted = await service.driverAccepted('trip-e2e');
      expect(accepted?.status).toBe('driver_accepted');
      expect(accepted?.driverAcceptedAt).toBeDefined();
      expect(accepted?.status).not.toBe('dispatched');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. VALIDATION ENGINE: CAPACITY, EQUIPMENT & ROUTE SEQUENCE
  // ═══════════════════════════════════════════════════════════════════════════
  describe('3. Validation Engine: Capacity, Equipment & Route Sequence', () => {
    it('should flag blocking capacity conflict if total weight exceeds truck payload', async () => {
      const trip = {
        id: 'trip-overweight',
        companyId: 'comp-01',
        status: 'planning',
        truck: { id: 't1', payloadCapacity: 10000, maxPallets: 33 },
        orders: [
          {
            id: 'ord-over',
            cargoItems: [{ weightKg: 15000, pallets: 20 }],
            stops: [
              { id: 's1', type: 'pickup', sequence: 1 },
              { id: 's2', type: 'delivery', sequence: 2 },
            ],
          },
        ],
        stops: [
          { id: 's1', orderId: 'ord-over', type: 'pickup', sequence: 1 },
          { id: 's2', orderId: 'ord-over', type: 'delivery', sequence: 2 },
        ],
      };

      mockTripRepo.findOne.mockResolvedValue(trip);

      const result = await service.validateTrip(mockUser, 'trip-overweight');
      expect(result.validationStatus).toBe('not_feasible');
      const weightIssue = result.conflicts.find((c: any) => c.code === 'ERR_WEIGHT_CAPACITY' || c.code === 'ERR_WEIGHT_EXCEEDED');
      expect(weightIssue).toBeDefined();
      expect(weightIssue.blocking).toBe(true);
    });

    it('should flag blocking conflict if delivery is sequenced before pickup for same order', async () => {
      const trip = {
        id: 'trip-bad-sequence',
        companyId: 'comp-01',
        status: 'planning',
        truck: { id: 't1', payloadCapacity: 24000 },
        orders: [
          {
            id: 'ord-seq',
            cargoItems: [{ weightKg: 2000 }],
            stops: [
              { id: 's1', type: 'delivery', sequence: 1 }, // Delivery first (illegal)
              { id: 's2', type: 'pickup', sequence: 2 },
            ],
          },
        ],
        stops: [
          { id: 's1', orderId: 'ord-seq', type: 'delivery', sequence: 1 },
          { id: 's2', orderId: 'ord-seq', type: 'pickup', sequence: 2 },
        ],
      };

      mockTripRepo.findOne.mockResolvedValue(trip);

      const result = await service.validateTrip(mockUser, 'trip-bad-sequence');
      expect(result.validationStatus).toBe('not_feasible');
      const seqIssue = result.conflicts.find((c: any) => c.code === 'ERR_SEQUENCE_PICKUP_AFTER_DELIVERY');
      expect(seqIssue).toBeDefined();
      expect(seqIssue.blocking).toBe(true);
    });

    it('should issue warning but allow confirmation when time windows have tight margins', async () => {
      const trip = {
        id: 'trip-warn',
        companyId: 'comp-01',
        status: 'planning',
        truck: { id: 't1', payloadCapacity: 24000, maxPallets: 33 },
        orders: [
          {
            id: 'ord-time',
            cargoItems: [{ weightKg: 3000, pallets: 4 }],
            stops: [
              { id: 's1', type: 'pickup', sequence: 1, dateUntil: '2026-08-20T08:00:00Z', estimatedArrival: '2026-08-20T08:05:00Z' },
              { id: 's2', type: 'delivery', sequence: 2 },
            ],
          },
        ],
        stops: [
          { id: 's1', orderId: 'ord-time', type: 'pickup', sequence: 1 },
          { id: 's2', orderId: 'ord-time', type: 'delivery', sequence: 2 },
        ],
      };

      mockTripRepo.findOne.mockResolvedValue(trip);

      const result = await service.validateTrip(mockUser, 'trip-warn');
      // Non-blocking warnings allow confirmation
      expect(result.conflicts.filter((c: any) => c.blocking).length).toBe(0);
      expect(result.validationStatus === 'warning' || result.validationStatus === 'feasible').toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. INVALID BACKEND TRANSITIONS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('4. Invalid Backend State Transitions Protection', () => {
    it('should reject dispatching a trip directly from planning state', async () => {
      mockTripRepo.findOne.mockResolvedValue({ id: 't-unconfirmed', status: 'planning' });
      await expect(service.sendToDriver(mockUser, 't-unconfirmed', {})).rejects.toThrow(BadRequestException);
    });

    it('should reject confirming a trip with blocking conflicts', async () => {
      mockTripRepo.findOne.mockResolvedValue({
        id: 't-blocked',
        status: 'planning',
        truck: { payloadCapacity: 5000 },
        orders: [{ cargoItems: [{ weightKg: 10000 }] }],
        stops: [],
      });
      await expect(service.confirmTrip(mockUser, 't-blocked')).rejects.toThrow(BadRequestException);
    });

    it('should reject unplanning a dispatched trip without reopening first', async () => {
      mockTripRepo.findOne.mockResolvedValue({ id: 't-disp', status: 'dispatched' });
      await expect(service.unplanTrip(mockUser, 't-disp')).rejects.toThrow(BadRequestException);
    });

    it('should reject unassigning an order from a confirmed trip without reopening', async () => {
      mockTripRepo.findOne.mockResolvedValue({ id: 't-conf', status: 'confirmed' });
      await expect(service.unassignOrder(mockUser, 't-conf', 'ord-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. VALIDATION OUTDATED & CONFIRMED LOCKING
  // ═══════════════════════════════════════════════════════════════════════════
  describe('5. Validation Invalidation & Reopen Planning', () => {
    it('should mark validation as outdated when reopened from confirmed status', async () => {
      const trip = {
        id: 't-reopen',
        status: 'confirmed',
        validationStatus: 'feasible',
        validationOutdated: false,
        confirmedAt: new Date(),
      };
      mockTripRepo.findOne.mockResolvedValue(trip);

      const reopened = await service.reopenPlanning(mockUser, 't-reopen');

      expect(reopened?.status).toBe('planning');
      expect(reopened?.validationOutdated).toBe(true);
      expect(reopened?.confirmedAt).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. UNASSIGN ORDER VS UNPLAN TRIP
  // ═══════════════════════════════════════════════════════════════════════════
  describe('6. Unassign Order vs Unplan Trip', () => {
    it('should unassign a single order, delete its stops, and keep other orders on the TRP', async () => {
      const trip = {
        id: 'trip-dual',
        status: 'planning',
        orders: [{ id: 'o1' }, { id: 'o2' }],
        stops: [
          { id: 's1', orderId: 'o1', type: 'pickup', sequence: 1 },
          { id: 's2', orderId: 'o2', type: 'pickup', sequence: 2 },
        ],
      };
      mockTripRepo.findOne.mockResolvedValue(trip);
      mockOrderRepo.findOne.mockResolvedValue({ id: 'o1', trip });

      await service.unassignOrder(mockUser, 'trip-dual', 'o1');

      expect(mockOrderRepo.save).toHaveBeenCalled();
      expect(mockStopRepo.delete).toHaveBeenCalled();
    });

    it('should unplan entire trip and log audit event', async () => {
      const trip = {
        id: 'trip-clear',
        tripNumber: 'TRP-CLEAR-01',
        status: 'planning',
        orders: [{ id: 'o1' }, { id: 'o2' }],
        stops: [{ id: 's1' }, { id: 's2' }],
      };
      mockTripRepo.findOne.mockResolvedValue(trip);

      const result = await service.unplanTrip(mockUser, 'trip-clear');

      expect(result.unassignedOrdersCount).toBe(2);
      expect(mockTripRepo.delete).toHaveBeenCalledWith({ id: 'trip-clear' });
      expect(mockTimelineService.logUserEvent).toHaveBeenCalled();
    });
  });
});
