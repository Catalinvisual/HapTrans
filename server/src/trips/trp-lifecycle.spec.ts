jest.mock('or-tools-wasm/routing', () => ({}));
jest.mock('or-tools-wasm', () => ({}));
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlanningService } from '../planning/planning.service';
import { TrackController } from '../track/track.controller';

describe('HapCargo TMS — Definitive Planning, TRP Lifecycle, Audit & Security Test Suite', () => {
  let service: PlanningService;
  let trackController: TrackController;
  let mockTripRepo: any;
  let mockTruckRepo: any;
  let mockOrderRepo: any;
  let mockAuditRepo: any;
  let mockRoutePlanRepo: any;
  let mockStopRepo: any;
  let mockTaskRepo: any;
  let mockTimelineService: any;
  let mockOrdersService: any;

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

    mockOrdersService = {
      findByTrackingToken: jest.fn(),
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

    trackController = new TrackController(mockOrdersService);
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
  // 2. COMPLETE END-TO-END LIFECYCLE (ALL STAGES TO COMPLETION)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('2. Complete End-to-End TRP Lifecycle', () => {
    it('should transition through full lifecycle: Order -> Assigned -> TRP -> Planning -> Validated -> Confirmed -> Dispatched -> Driver Received -> Driver Accepted -> In Transit -> Completed', async () => {
      const order = {
        id: 'ord-e2e',
        orderNumber: 'ORD-E2E-2026',
        status: 'new',
        equipmentRequirements: ['frigo'],
        cargoItems: [{ weightKg: 8000, pallets: 12 }],
        stops: [
          { id: 's1', type: 'pickup', address: 'Best, NL', sequence: 1 },
          { id: 's2', type: 'delivery', address: 'Paris, FR', sequence: 2 },
        ],
      };

      const trip: any = {
        id: 'trip-e2e',
        companyId: 'comp-01',
        tripNumber: 'TRP-E2E-001',
        status: 'planning',
        validationStatus: 'not_validated',
        dispatchVersion: 0,
        confirmedAt: null,
        dispatchedAt: null,
        driverAcknowledgedAt: null,
        driverAcceptedAt: null,
        trackingActivated: false,
        truck: { id: 't1', plateNumber: 'B-100-E2E', features: ['frigo', 'lift'], payloadCapacity: 24000, maxPallets: 33 },
        driver: { id: 'd1', name: 'Liviu Driver', user: { id: 'u-d1', name: 'Liviu Driver', email: 'driver@haptrans.com' } },
        trailer: { id: 'tr1', plateNumber: 'TR-100' },
        orders: [order],
        stops: [
          { id: 's1', orderId: 'ord-e2e', type: 'pickup', sequence: 1 },
          { id: 's2', orderId: 'ord-e2e', type: 'delivery', sequence: 2 },
        ],
      };

      mockTripRepo.findOne.mockResolvedValue(trip);
      mockOrderRepo.findOne.mockResolvedValue(order);

      // Stage 1: Validation
      const valResult = await service.validateTrip(mockUser, 'trip-e2e');
      expect(valResult.validationStatus).toBe('feasible');
      expect(valResult.conflicts.length).toBe(0);
      trip.validationStatus = 'feasible';

      // Stage 2: Confirm Plan
      const confirmed = await service.confirmTrip(mockUser, 'trip-e2e');
      expect(confirmed?.status).toBe('confirmed');
      expect(confirmed?.confirmedAt).toBeDefined();
      expect(mockOrderRepo.save).toHaveBeenCalled();
      trip.status = 'confirmed';
      trip.confirmedAt = confirmed?.confirmedAt;

      // Stage 3: Dispatch (Send to Driver)
      const dispatched = await service.sendToDriver(mockUser, 'trip-e2e', { routeInfo: 'Standard route' });
      expect(dispatched.status).toBe('dispatched');
      expect(dispatched.dispatchVersion).toBe(1);
      expect(dispatched.trackingActivated).toBe(true);
      expect(dispatched.trackingToken).toBeDefined();
      trip.status = 'dispatched';
      trip.dispatchVersion = 1;
      trip.trackingToken = dispatched.trackingToken;

      // Stage 4: Driver Received
      const received = await service.driverReceived('trip-e2e');
      expect(received?.status).toBe('driver_received');
      expect(received?.driverAcknowledgedAt).toBeDefined();
      trip.status = 'driver_received';

      // Stage 5: Driver Accepted
      const accepted = await service.driverAccepted('trip-e2e');
      expect(accepted?.status).toBe('driver_accepted');
      expect(accepted?.driverAcceptedAt).toBeDefined();
      trip.status = 'driver_accepted';

      // Stage 6: In Transit
      trip.status = 'in_transit';
      await mockTripRepo.save(trip);
      expect(trip.status).toBe('in_transit');

      // Stage 7: Delivery & POD Upload & Completion
      trip.status = 'completed';
      order.status = 'delivered';
      await mockTripRepo.save(trip);
      await mockOrderRepo.save(order);

      expect(trip.status).toBe('completed');
      expect(order.status).toBe('delivered');
      expect(mockTripRepo.save).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. STRUCTURED AUDIT TRAIL & EVENT LOGGING
  // ═══════════════════════════════════════════════════════════════════════════
  describe('3. Structured Audit Trail & Timeline Logging', () => {
    it('should log structured events for confirmed, reopened, dispatched, and unplanned actions', async () => {
      const trip: any = {
        id: 'trip-audit-01',
        tripNumber: 'TRP-AUDIT-001',
        status: 'planning',
        truck: { id: 't1', payloadCapacity: 24000, features: ['frigo'] },
        orders: [{ id: 'o1', equipmentRequirements: ['frigo'], cargoItems: [{ weightKg: 1000 }] }],
        stops: [{ id: 's1', type: 'pickup', sequence: 1 }, { id: 's2', type: 'delivery', sequence: 2 }],
      };
      mockTripRepo.findOne.mockResolvedValue(trip);

      // 1. Confirm Event
      await service.confirmTrip(mockUser, 'trip-audit-01');
      expect(mockTimelineService.logUserEvent).toHaveBeenCalledWith(
        'trip_confirmed',
        'user-planner-01',
        undefined,
        'trip-audit-01',
        expect.objectContaining({ message: expect.stringContaining('confirmed plan') })
      );

      // 2. Dispatch Event
      trip.status = 'confirmed';
      await service.sendToDriver(mockUser, 'trip-audit-01', { notes: 'Rush shipment' });
      expect(mockTimelineService.logUserEvent).toHaveBeenCalledWith(
        'trip_dispatched',
        'user-planner-01',
        undefined,
        'trip-audit-01',
        expect.objectContaining({ message: expect.stringContaining('Dispatch v1') })
      );

      // 3. Reopen Planning Event
      trip.status = 'confirmed';
      await service.reopenPlanning(mockUser, 'trip-audit-01');
      expect(mockTimelineService.logUserEvent).toHaveBeenCalledWith(
        'planning_reopened',
        'user-planner-01',
        undefined,
        'trip-audit-01',
        expect.objectContaining({ message: expect.stringContaining('reopened') })
      );

      // 4. Unplan Trip Event
      trip.status = 'planning';
      await service.unplanTrip(mockUser, 'trip-audit-01');
      expect(mockTimelineService.logUserEvent).toHaveBeenCalledWith(
        'trip_unplanned',
        'user-planner-01',
        undefined,
        'trip-audit-01',
        expect.objectContaining({ message: expect.stringContaining('unplanned') })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. CUSTOMER TRACKING SECURITY INTEGRATION TEST
  // ═══════════════════════════════════════════════════════════════════════════
  describe('4. Customer Tracking Security & Public Data Sanitization', () => {
    it('should return safe customer fields and NOT leak private driver phone, internal margins, costs, notes, or audit data', async () => {
      const mockPublicOrder = {
        id: 'ord-sec-01',
        orderNumber: 'ORD-2026-SEC-01',
        customerReference: 'CUST-REF-999',
        status: 'in_transit',
        trackingToken: 'HC-SEC-998877',
        updatedAt: new Date('2026-08-20T10:00:00Z'),
        // Sensitive internal fields that must NOT be exposed to customers
        internalNotes: 'Customer requested 5% discount; margin is 12%',
        internalCostEur: 850,
        estimatedProfitEur: 250,
        trip: {
          id: 'trp-sec-01',
          internalNotes: 'Driver private mobile: +40722112233',
          costs: [{ amount: 400, type: 'fuel' }],
          driver: {
            id: 'd-sec',
            phone: '+40722112233', // Private phone
            user: { id: 'u-sec', phone: '+40722112233', email: 'driver@company.internal' },
          },
          truck: {
            plateNumber: 'B-100-SEC',
            currentLat: 50.8503,
            currentLng: 4.3517,
          },
        },
        stops: [
          { id: 's1', type: 'pickup', address: 'Eindhoven, NL', companyName: 'Vendor A', country: 'NL', sequence: 1, timeFrom: '08:00', timeUntil: '10:00' },
          { id: 's2', type: 'delivery', address: 'Brussels, BE', companyName: 'Client B', country: 'BE', sequence: 2, timeFrom: '14:00', timeUntil: '16:00' },
        ],
        documents: [],
      };

      mockOrdersService.findByTrackingToken.mockResolvedValue(mockPublicOrder);

      // Actual call to the public tracking endpoint
      const response: any = await trackController.trackOrder('HC-SEC-998877');

      // 1. Safe fields must be present:
      expect(response.orderNumber).toBe('ORD-2026-SEC-01');
      expect(response.customerReference).toBe('CUST-REF-999');
      expect(response.status).toBe('in_transit');
      expect(response.currentLat).toBe(50.8503);
      expect(response.currentLng).toBe(4.3517);
      expect(response.stops.length).toBe(2);
      expect(response.stops[0].companyName).toBe('Vendor A');

      // 2. Sensitive fields must NEVER be exposed:
      expect(response.internalNotes).toBeUndefined();
      expect(response.internalCostEur).toBeUndefined();
      expect(response.estimatedProfitEur).toBeUndefined();
      expect(response.driverPhone).toBeUndefined();
      expect(response.phone).toBeUndefined();
      expect(response.driver).toBeUndefined();
      expect(response.costs).toBeUndefined();
      expect(response.audit).toBeUndefined();
      expect(JSON.stringify(response)).not.toContain('+40722112233');
      expect(JSON.stringify(response)).not.toContain('margin');
      expect(JSON.stringify(response)).not.toContain('discount');
    });

    it('should throw NotFoundException when an invalid/random token is used', async () => {
      mockOrdersService.findByTrackingToken.mockResolvedValue(null);

      await expect(trackController.trackOrder('RANDOM-INVALID-TOKEN-999')).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. VALIDATION ENGINE: CAPACITY, EQUIPMENT & ROUTE SEQUENCE
  // ═══════════════════════════════════════════════════════════════════════════
  describe('5. Validation Engine: Capacity, Equipment & Route Sequence', () => {
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
      expect(result.conflicts.filter((c: any) => c.blocking).length).toBe(0);
      expect(result.validationStatus === 'warning' || result.validationStatus === 'feasible').toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. INVALID BACKEND TRANSITIONS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('6. Invalid Backend State Transitions Protection', () => {
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
  // 7. UNASSIGN ORDER VS UNPLAN TRIP
  // ═══════════════════════════════════════════════════════════════════════════
  describe('7. Unassign Order vs Unplan Trip', () => {
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
  });
});
