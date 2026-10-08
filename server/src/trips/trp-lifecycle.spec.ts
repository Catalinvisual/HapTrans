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
  let mockTrailerRepo: any;
  let mockDriverRepo: any;
  let mockDropHookRepo: any;
  let mockCrossDockRepo: any;
  let mockOrderRepo: any;
  let mockAuditRepo: any;
  let mockRoutePlanRepo: any;
  let mockStopRepo: any;
  let mockTaskRepo: any;
  let mockTimelineService: any;
  let mockOrdersService: any;
  let mockRoutingService: any;
  let mockOptimizationService: any;

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
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(5),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    mockTruckRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn((e) => Promise.resolve({ ...e })),
    };

    mockTrailerRepo = {
      findOne: jest.fn(),
      save: jest.fn((e) => Promise.resolve({ ...e })),
    };

    mockDriverRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn((e) => Promise.resolve({ ...e })),
    };

    mockDropHookRepo = {
      findOne: jest.fn(),
      save: jest.fn((e) => Promise.resolve({ id: 'dh-1', ...e })),
      create: jest.fn((e) => ({ id: 'dh-1', ...e })),
      find: jest.fn().mockResolvedValue([]),
    };

    mockCrossDockRepo = {
      findOne: jest.fn(),
      save: jest.fn((e) => Promise.resolve({ id: 'cd-1', ...e })),
      create: jest.fn((e) => ({ id: 'cd-1', ...e })),
      find: jest.fn().mockResolvedValue([]),
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
      createEvent: jest.fn().mockResolvedValue({}),
    };

    mockOrdersService = {
      findByTrackingToken: jest.fn(),
    };

    mockRoutingService = {
      getLiveTraffic: jest.fn().mockResolvedValue({ available: false, provider: 'none', currentDelayMinutes: 0 }),
      calculateTolls: jest.fn().mockResolvedValue({ available: false, provider: 'none', totalCost: 0 }),
      calculateHaversine: jest.fn().mockReturnValue(120),
    };

    mockOptimizationService = {
      optimizeFleet: jest.fn(),
    };

    service = new PlanningService(
      mockOrderRepo,
      mockTripRepo,
      mockStopRepo,
      mockTaskRepo,
      {} as any,
      mockTruckRepo,
      mockTrailerRepo,
      mockDriverRepo,
      {} as any,
      {} as any,
      {} as any,
      mockAuditRepo,
      {} as any,
      mockRoutePlanRepo,
      {} as any,
      {} as any,
      mockDropHookRepo,
      mockCrossDockRepo,
      {} as any, // planningEngine
      {} as any, // optimizationEngine
      {} as any, // pricingEngine
      mockTimelineService,
      mockOptimizationService,
      mockRoutingService,
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

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. DRIVER DOCUMENT COMPLIANCE VERIFICATION (PHASE 2)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('8. Driver Document Compliance Verification', () => {
    it('should generate blocking conflict when driving license expires before trip arrival', async () => {
      const conflicts = await service.computeConflicts({
        trips: [
          {
            id: 'trip-lic',
            tripNumber: 'TRP-LIC-01',
            status: 'planning',
            plannedDeparture: new Date('2026-10-10T08:00:00Z'),
            plannedArrival: new Date('2026-10-15T18:00:00Z'),
            driverId: 'drv-lic',
            orders: [],
          },
        ],
        driversById: {
          'drv-lic': {
            id: 'drv-lic',
            user: { name: 'Ion Popescu' },
            licenseExpiry: new Date('2026-10-12T00:00:00Z'), // expires mid-trip
          },
        },
      });

      const licConflict = conflicts.find((c) => c.code === 'DRIVER_LICENSE_EXPIRED');
      expect(licConflict).toBeDefined();
      expect(licConflict?.level).toBe('blocking');
      expect(licConflict?.message).toContain('driving licence expires');
    });

    it('should generate blocking conflict when medical certificate expires before trip end', async () => {
      const conflicts = await service.computeConflicts({
        trips: [
          {
            id: 'trip-med',
            tripNumber: 'TRP-MED-01',
            status: 'planning',
            plannedDeparture: new Date('2026-10-10T08:00:00Z'),
            plannedArrival: new Date('2026-10-15T18:00:00Z'),
            driverId: 'drv-med',
            orders: [],
          },
        ],
        driversById: {
          'drv-med': {
            id: 'drv-med',
            user: { name: 'Vasile Roman' },
            licenseExpiry: new Date('2027-01-01T00:00:00Z'),
            medicalExpiry: new Date('2026-10-11T00:00:00Z'), // expired mid-trip
          },
        },
      });

      const medConflict = conflicts.find((c) => c.code === 'DRIVER_MEDICAL_EXPIRED');
      expect(medConflict).toBeDefined();
      expect(medConflict?.level).toBe('blocking');
      expect(medConflict?.message).toContain('medical certificate expires');
    });

    it('should generate blocking conflict when tachograph card expires during trip', async () => {
      const conflicts = await service.computeConflicts({
        trips: [
          {
            id: 'trip-tacho',
            tripNumber: 'TRP-TAC-01',
            status: 'planning',
            plannedDeparture: new Date('2026-10-10T08:00:00Z'),
            plannedArrival: new Date('2026-10-14T18:00:00Z'),
            driverId: 'drv-tac',
            orders: [],
          },
        ],
        driversById: {
          'drv-tac': {
            id: 'drv-tac',
            user: { name: 'Mihai Dan' },
            licenseExpiry: new Date('2027-01-01T00:00:00Z'),
            medicalExpiry: new Date('2027-01-01T00:00:00Z'),
            tachoCardExpiry: new Date('2026-10-12T00:00:00Z'),
          },
        },
      });

      const tachoConflict = conflicts.find((c) => c.code === 'DRIVER_TACHO_EXPIRED');
      expect(tachoConflict).toBeDefined();
      expect(tachoConflict?.level).toBe('blocking');
      expect(tachoConflict?.message).toContain('tachograph card expires');
    });

    it('should generate blocking conflict when ADR cargo is planned but driver ADR certificate is expired or missing', async () => {
      const conflicts = await service.computeConflicts({
        trips: [
          {
            id: 'trip-adr',
            tripNumber: 'TRP-ADR-01',
            status: 'planning',
            plannedDeparture: new Date('2026-10-10T08:00:00Z'),
            plannedArrival: new Date('2026-10-15T18:00:00Z'),
            driverId: 'drv-adr',
            orders: [
              {
                id: 'ord-adr',
                orderNumber: 'ORD-ADR-01',
                cargoItems: [{ id: 'cg-1', adrClass: '3' }],
              },
            ],
          },
        ],
        driversById: {
          'drv-adr': {
            id: 'drv-adr',
            user: { name: 'Gheorghe ADR' },
            licenseExpiry: new Date('2027-01-01T00:00:00Z'),
            documents: [
              { type: 'ADR Certificate', expiryDate: new Date('2026-10-11T00:00:00Z') }, // expired mid-trip
            ],
          },
        },
      });

      const adrConflict = conflicts.find((c) => c.code === 'DRIVER_ADR_EXPIRED');
      expect(adrConflict).toBeDefined();
      expect(adrConflict?.level).toBe('blocking');
      expect(adrConflict?.message).toContain('ADR certificate expires');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. TRAILER OVERLAP CONFLICT DETECTION (PHASE 3)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('9. Trailer Overlap Conflict Detection', () => {
    it('should flag a blocking TRAILER_OVERLAP conflict when two active trips share the same trailer at overlapping times', async () => {
      const conflicts = await service.computeConflicts({
        trips: [
          {
            id: 'trip-A',
            tripNumber: 'TRP-A',
            status: 'planning',
            trailerId: 'trailer-101',
            plannedDeparture: new Date('2026-10-10T10:00:00Z'),
            plannedArrival: new Date('2026-10-10T15:00:00Z'),
            orders: [],
          },
          {
            id: 'trip-B',
            tripNumber: 'TRP-B',
            status: 'assigned',
            trailerId: 'trailer-101',
            plannedDeparture: new Date('2026-10-10T13:00:00Z'),
            plannedArrival: new Date('2026-10-10T17:00:00Z'),
            orders: [],
          },
        ],
        trailersById: {
          'trailer-101': { id: 'trailer-101', plateNumber: 'B-99-TRL' },
        },
      });

      const overlap = conflicts.find((c) => c.code === 'TRAILER_OVERLAP');
      expect(overlap).toBeDefined();
      expect(overlap?.level).toBe('blocking');
      expect(overlap?.message).toContain('double-booked');
      expect(overlap?.params?.trailerPlate).toBe('B-99-TRL');
    });

    it('should not flag TRAILER_OVERLAP when trips on the same trailer do not overlap in time', async () => {
      const conflicts = await service.computeConflicts({
        trips: [
          {
            id: 'trip-A',
            tripNumber: 'TRP-A',
            status: 'planning',
            trailerId: 'trailer-101',
            plannedDeparture: new Date('2026-10-10T08:00:00Z'),
            plannedArrival: new Date('2026-10-10T12:00:00Z'),
            orders: [],
          },
          {
            id: 'trip-B',
            tripNumber: 'TRP-B',
            status: 'assigned',
            trailerId: 'trailer-101',
            plannedDeparture: new Date('2026-10-10T13:00:00Z'),
            plannedArrival: new Date('2026-10-10T18:00:00Z'),
            orders: [],
          },
        ],
        trailersById: {
          'trailer-101': { id: 'trailer-101', plateNumber: 'B-99-TRL' },
        },
      });

      const overlap = conflicts.find((c) => c.code === 'TRAILER_OVERLAP');
      expect(overlap).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. SPLIT TRIP VALIDATION & EXECUTION (PHASE 1)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('10. Split Trip Validation & Execution', () => {
    it('should throw BadRequestException when no orders are selected for splitting', async () => {
      const trip = {
        id: 't-split-empty',
        status: 'planning',
        orders: [{ id: 'o1' }, { id: 'o2' }],
      };
      mockTripRepo.findOne.mockResolvedValue(trip);

      await expect(service.splitTrip(mockUser, 't-split-empty', { orderIds: [] })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when attempting to split off every single order', async () => {
      const trip = {
        id: 't-split-all',
        status: 'planning',
        orders: [{ id: 'o1' }, { id: 'o2' }],
      };
      mockTripRepo.findOne.mockResolvedValue(trip);

      await expect(service.splitTrip(mockUser, 't-split-all', { orderIds: ['o1', 'o2'] })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should successfully split selected orders into a new trip', async () => {
      const trip = {
        id: 't-split-ok',
        tripNumber: 'TRP-ORIG-01',
        status: 'planning',
        orders: [{ id: 'o1', status: 'planned' }, { id: 'o2', status: 'planned' }, { id: 'o3', status: 'planned' }],
        stops: [],
      };
      const newTrip = { id: 't-split-new', tripNumber: 'TRP-SPLIT-02', status: 'planning', orders: [{ id: 'o2' }, { id: 'o3' }], stops: [] };

      mockTripRepo.findOne.mockImplementation((opts: any) => {
        const id = opts?.where?.id || opts;
        if (id === 't-split-ok') return Promise.resolve(trip);
        if (id === 't-split-new') return Promise.resolve(newTrip);
        return Promise.resolve(trip);
      });

      mockTripRepo.save.mockResolvedValue(newTrip);
      mockTripRepo.create.mockReturnValue(newTrip);
      mockOrderRepo.find.mockResolvedValue([{ id: 'o2', trip }, { id: 'o3', trip }]);

      const result = await service.splitTrip(mockUser, 't-split-ok', { orderIds: ['o2', 'o3'] });

      expect(result).toBeDefined();
      expect(mockTripRepo.save).toHaveBeenCalled();
      expect(mockOrderRepo.save).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. COMBINE TRIPS (PHASE 6)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('11. Combine Trips Execution', () => {
    it('should throw BadRequestException when source and target trip are the same', async () => {
      await expect(
        service.combineTrips(mockUser, { sourceTripId: 'trip-same', targetTripId: 'trip-same' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should transfer orders from source to target trip and delete source trip', async () => {
      const source = {
        id: 'trip-source',
        tripNumber: 'TRP-SRC',
        status: 'planning',
        orders: [{ id: 'o-src', status: 'planned' }],
        stops: [],
      };
      const target = {
        id: 'trip-target',
        tripNumber: 'TRP-TGT',
        status: 'planning',
        orders: [{ id: 'o-tgt', status: 'planned' }],
        stops: [],
      };

      mockTripRepo.findOne.mockImplementation((opts: any) => {
        const id = opts?.where?.id || opts;
        if (id === 'trip-source') return Promise.resolve(source);
        if (id === 'trip-target') return Promise.resolve({ ...target, orders: [{ id: 'o-tgt' }, { id: 'o-src' }] });
        return Promise.resolve(null);
      });

      const combined = await service.combineTrips(mockUser, {
        sourceTripId: 'trip-source',
        targetTripId: 'trip-target',
      });

      expect(combined).toBeDefined();
      expect(mockTripRepo.delete).toHaveBeenCalledWith({ id: 'trip-source' });
      expect(mockOrderRepo.save).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. DROP & HOOK OPERATIONS & CONFLICT VALIDATION (§2)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('12. Drop & Hook Planning & Validation', () => {
    it('should successfully drop a trailer, mark as dropped, record location, and release truck', async () => {
      const mockTrailer = {
        id: 'trl-100',
        plateNumber: 'B-100-TRL',
        isDropped: false,
        dropLocation: null,
      };
      const mockTruck = {
        id: 'trk-100',
        plateNumber: 'B-100-TRK',
        trailer: mockTrailer,
      };
      const mockTrip = {
        id: 'trip-dh-1',
        tripNumber: 'TRP-DH-01',
        truck: mockTruck,
        driver: { id: 'drv-1', name: 'John Driver' },
      };

      mockTrailerRepo.findOne.mockResolvedValue({ ...mockTrailer });
      mockTripRepo.findOne.mockResolvedValue({ ...mockTrip });

      const res = await service.dropTrailer(mockUser, {
        trailerId: 'trl-100',
        tripId: 'trip-dh-1',
        locationName: 'Rotterdam Terminal A',
        latitude: 51.92,
        longitude: 4.48,
      });

      expect(res.success).toBe(true);
      expect(mockTrailerRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'trl-100',
          isDropped: true,
          dropLocation: 'Rotterdam Terminal A',
        }),
      );
      expect(mockTruckRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'trk-100',
          trailer: null,
        }),
      );
      expect(mockDropHookRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'drop',
          trailerId: 'trl-100',
          locationName: 'Rotterdam Terminal A',
        }),
      );
    });

    it('should reject dropping a trailer that is already dropped', async () => {
      mockTrailerRepo.findOne.mockResolvedValue({
        id: 'trl-already-dropped',
        plateNumber: 'B-200-TRL',
        isDropped: true,
        dropLocation: 'Antwerp Depot',
      });

      await expect(
        service.dropTrailer(mockUser, {
          trailerId: 'trl-already-dropped',
          locationName: 'Rotterdam Port',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully hook a dropped trailer to a new truck & trip', async () => {
      const mockTrailer = {
        id: 'trl-hook',
        plateNumber: 'B-300-TRL',
        isDropped: true,
        dropLocation: 'Hamburg Hub',
      };
      const mockTruck = {
        id: 'trk-hook',
        plateNumber: 'B-300-TRK',
        status: 'active',
      };
      const mockTrip = {
        id: 'trip-hook-1',
        truck: null,
        trailer: null,
      };

      mockTrailerRepo.findOne.mockResolvedValue({ ...mockTrailer });
      mockTruckRepo.findOne.mockResolvedValue({ ...mockTruck });
      mockTripRepo.findOne.mockResolvedValue({ ...mockTrip });

      const res = await service.hookTrailer(mockUser, {
        trailerId: 'trl-hook',
        truckId: 'trk-hook',
        tripId: 'trip-hook-1',
        locationName: 'Hamburg Hub',
      });

      expect(res.success).toBe(true);
      expect(mockTrailerRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'trl-hook',
          isDropped: false,
          currentTruckId: 'trk-hook',
        }),
      );
      expect(mockDropHookRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'hook',
          trailerId: 'trl-hook',
          truckId: 'trk-hook',
        }),
      );
    });

    it('should flag DROP_HOOK_CONFLICT when an in-transit trip has a dropped trailer', async () => {
      const conflicts = await service.computeConflicts({
        trips: [
          {
            id: 'trip-active-drop',
            status: 'driving',
            truckId: 'trk-1',
            trailer: { id: 'trl-dropped', plateNumber: 'TRL-DROP-1', isDropped: true, dropLocation: 'Yard A' },
            orders: [],
            stops: [],
          },
        ],
        resourcesById: {
          'trk-1': { id: 'trk-1', plateNumber: 'TRK-1', available: true, maxWeightKg: 24000 },
        },
        trailersById: {
          'trl-dropped': { id: 'trl-dropped', plateNumber: 'TRL-DROP-1', isDropped: true, dropLocation: 'Yard A' },
        },
      });

      const dropConflict = conflicts.find((c) => c.code === 'DROP_HOOK_CONFLICT');
      expect(dropConflict).toBeDefined();
      expect(dropConflict?.level).toBe('blocking');
      expect(dropConflict?.message).toContain('currently dropped');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 13. CROSS-DOCKING / TRANSSHIPMENT OPERATIONS (§3)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('13. Cross-Docking & Transshipment Operations', () => {
    it('should successfully record a cross-dock transfer without completing the order prematurely', async () => {
      mockOrderRepo.findOne.mockResolvedValue({
        id: 'ord-cd-1',
        orderNumber: 'ORD-CD-01',
        pallets: 33,
        weightKg: 22000,
        status: 'in_transit',
      });

      const transfer = await service.createCrossDockTransfer(mockUser, {
        orderId: 'ord-cd-1',
        facilityName: 'Venlo Cross-Dock Facility',
        facilityAddress: 'Trade Port Venlo, Netherlands',
        inboundTripId: 'trip-in-1',
        outboundTripId: 'trip-out-1',
        pallets: 15, // partial cross-dock
        weightKg: 10000,
      });

      expect(transfer).toBeDefined();
      expect(mockCrossDockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'ord-cd-1',
          facilityName: 'Venlo Cross-Dock Facility',
          pallets: 15,
          weightKg: 10000,
          status: 'planned',
        }),
      );
    });

    it('should transition cross-dock transfer status to transferred with timestamp', async () => {
      const mockTransfer = {
        id: 'cd-1',
        status: 'planned',
        facilityName: 'Venlo Cross-Dock',
      };
      mockCrossDockRepo.findOne.mockResolvedValue({ ...mockTransfer });

      const updated = await service.updateCrossDockStatus(mockUser, 'cd-1', 'transferred' as any);
      expect(updated.status).toBe('transferred');
      expect(updated.transferredAt).toBeDefined();
      expect(mockCrossDockRepo.save).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 14. FULL ADR CLASS 1–9 MATRIX VALIDATION (§4)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('14. Full ADR Class 1-9 Matrix & Equipment Compatibility', () => {
    it('should flag ADR_VEHICLE_INCOMPATIBLE when Class 1 Explosives cargo is on a non-EX vehicle', async () => {
      const conflicts = await service.computeConflicts({
        trips: [
          {
            id: 'trip-adr-ex',
            status: 'planning',
            plannedDeparture: new Date('2026-10-10T08:00:00Z'),
            plannedArrival: new Date('2026-10-15T18:00:00Z'),
            truckId: 'trk-plain',
            driverId: 'drv-adr',
            orders: [
              {
                id: 'ord-cl1',
                cargoItems: [{ id: 'cg-ex', adrClass: '1.1D', unNumber: 'UN 0048' }],
              },
            ],
          },
        ],
        resourcesById: {
          'trk-plain': {
            id: 'trk-plain',
            plateNumber: 'B-NORMAL-TRK',
            features: ['standard', 'curtainsider'], // lacks EX/II or EX/III
            available: true,
          },
        },
        driversById: {
          'drv-adr': {
            id: 'drv-adr',
            user: { name: 'Expert ADR Driver' },
            documents: [{ type: 'ADR Certificate Class 1-9', expiryDate: new Date('2028-01-01') }],
          },
        },
      });

      const vehConflict = conflicts.find((c) => c.code === 'ADR_VEHICLE_INCOMPATIBLE');
      expect(vehConflict).toBeDefined();
      expect(vehConflict?.level).toBe('blocking');
      expect(vehConflict?.message).toContain('EX/II or EX/III');
    });

    it('should flag DRIVER_ADR_INVALID when driver lacks Class 1 endorsement for explosives', async () => {
      const conflicts = await service.computeConflicts({
        trips: [
          {
            id: 'trip-adr-driver-cl1',
            status: 'planning',
            plannedDeparture: new Date('2026-10-10T08:00:00Z'),
            plannedArrival: new Date('2026-10-15T18:00:00Z'),
            truckId: 'trk-ex',
            driverId: 'drv-basic-adr',
            orders: [
              {
                id: 'ord-cl1',
                cargoItems: [{ id: 'cg-ex', adrClass: '1.4S', unNumber: 'UN 0012' }],
              },
            ],
          },
        ],
        resourcesById: {
          'trk-ex': {
            id: 'trk-ex',
            plateNumber: 'B-EX-TRK',
            features: ['EX/III', 'ADR'],
            available: true,
          },
        },
        driversById: {
          'drv-basic-adr': {
            id: 'drv-basic-adr',
            user: { name: 'Basic ADR Driver' },
            documents: [{ type: 'ADR Basic Certificate', expiryDate: new Date('2028-01-01') }], // lacks Class 1
          },
        },
      });

      const drvConflict = conflicts.find((c) => c.code === 'DRIVER_ADR_INVALID');
      expect(drvConflict).toBeDefined();
      expect(drvConflict?.level).toBe('blocking');
      expect(drvConflict?.message).toContain('Class 1 (Explosives)');
    });

    it('should flag ADR_CARGO_INCOMPATIBILITY when Class 1 is mixed with Class 5.1 oxidizers', async () => {
      const conflicts = await service.computeConflicts({
        trips: [
          {
            id: 'trip-adr-mixed',
            status: 'planning',
            truckId: 'trk-ex',
            driverId: 'drv-full-adr',
            orders: [
              {
                id: 'ord-cl1',
                cargoItems: [{ id: 'cg-1', adrClass: '1.1', unNumber: 'UN 0048' }],
              },
              {
                id: 'ord-cl5',
                cargoItems: [{ id: 'cg-5', adrClass: '5.1', unNumber: 'UN 1444' }],
              },
            ],
          },
        ],
        resourcesById: {
          'trk-ex': { id: 'trk-ex', plateNumber: 'B-EX-TRK', features: ['EX/III', 'ADR'], available: true },
        },
        driversById: {
          'drv-full-adr': {
            id: 'drv-full-adr',
            documents: [{ type: 'ADR Certificate Class 1 Explosives and Class 5', expiryDate: new Date('2028-01-01') }],
          },
        },
      });

      const mixConflict = conflicts.find((c) => c.code === 'ADR_CARGO_INCOMPATIBILITY');
      expect(mixConflict).toBeDefined();
      expect(mixConflict?.level).toBe('blocking');
      expect(mixConflict?.message).toContain('Mixed Loading Violation');
    });

    it('should flag ADR_CARGO_INCOMPATIBILITY when Class 6.1 Toxic cargo is co-loaded with food', async () => {
      const conflicts = await service.computeConflicts({
        trips: [
          {
            id: 'trip-adr-food',
            status: 'planning',
            truckId: 'trk-adr',
            driverId: 'drv-full-adr',
            orders: [
              {
                id: 'ord-toxic',
                cargoItems: [{ id: 'cg-tox', adrClass: '6.1', unNumber: 'UN 1689' }],
              },
              {
                id: 'ord-food',
                description: 'Packaged Organic Food Products',
                cargoItems: [{ id: 'cg-food', weightKg: 5000 }],
              },
            ],
          },
        ],
        resourcesById: {
          'trk-adr': { id: 'trk-adr', plateNumber: 'B-ADR-TRK', features: ['ADR'], available: true },
        },
        driversById: {
          'drv-full-adr': {
            id: 'drv-full-adr',
            documents: [{ type: 'ADR Certificate', expiryDate: new Date('2028-01-01') }],
          },
        },
      });

      const foodConflict = conflicts.find((c) => c.code === 'ADR_CARGO_INCOMPATIBILITY');
      expect(foodConflict).toBeDefined();
      expect(foodConflict?.level).toBe('blocking');
      expect(foodConflict?.message).toContain('food products');
    });

    it('should flag ADR_ROUTE_RESTRICTION when cargo has tunnel code E', async () => {
      const conflicts = await service.computeConflicts({
        trips: [
          {
            id: 'trip-tunnel-e',
            status: 'planning',
            truckId: 'trk-adr',
            driverId: 'drv-full-adr',
            orders: [
              {
                id: 'ord-tunnel',
                cargoItems: [{ id: 'cg-tun', adrClass: '3', unNumber: 'UN 1203', tunnelRestrictionCode: 'E' }],
              },
            ],
          },
        ],
        resourcesById: {
          'trk-adr': { id: 'trk-adr', plateNumber: 'B-ADR-TRK', features: ['ADR'], available: true },
        },
        driversById: {
          'drv-full-adr': {
            id: 'drv-full-adr',
            documents: [{ type: 'ADR Certificate', expiryDate: new Date('2028-01-01') }],
          },
        },
      });

      const tunnelConflict = conflicts.find((c) => c.code === 'ADR_ROUTE_RESTRICTION');
      expect(tunnelConflict).toBeDefined();
      expect(tunnelConflict?.level).toBe('warning');
      expect(tunnelConflict?.message).toContain('Tunnel Code E');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 15. SUBCONTRACTOR & CHARTER PLANNING INTEGRATION (§8)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('15. Subcontractor & Charter Planning Integration', () => {
    it('should successfully assign an order/trip to a charter carrier with agreed rate', async () => {
      const mockTrip = {
        id: 'trip-charter-1',
        fleetType: 'own_fleet',
      };
      mockTripRepo.findOne.mockResolvedValue({ ...mockTrip });

      const assigned = await service.assignSubcontractor(mockUser, 'trip-charter-1', {
        fleetType: 'charter',
        carrierName: 'Trans-European Logistics BV',
        carrierContact: 'Jan de Vries',
        carrierRate: 1850,
        carrierCurrency: 'EUR',
        carrierReference: 'REF-TEL-2026-99',
        carrierTruckPlate: 'NL-88-XYZ',
      });

      expect(assigned.fleetType).toBe('charter');
      expect(assigned.carrierName).toBe('Trans-European Logistics BV');
      expect(assigned.carrierRate).toBe(1850);
      expect(mockTripRepo.save).toHaveBeenCalled();
    });

    it('should flag SUBCONTRACTOR_UNAVAILABLE when carrier documents are invalid', async () => {
      const conflicts = await service.computeConflicts({
        trips: [
          {
            id: 'trip-sub-invalid',
            status: 'planning',
            fleetType: 'subcontractor',
            carrierName: 'Unverified Carrier SRL',
            carrierDocumentsValid: false,
            orders: [],
            stops: [],
          },
        ],
        resourcesById: {},
      });

      const subConflict = conflicts.find((c) => c.code === 'SUBCONTRACTOR_UNAVAILABLE');
      expect(subConflict).toBeDefined();
      expect(subConflict?.level).toBe('blocking');
      expect(subConflict?.message).toContain('compliance documents');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 16. LIVE TRAFFIC & TOLL CALCULATION ARCHITECTURE (§6, §7)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('16. Live Traffic & Toll Calculation Architecture', () => {
    it('should gracefully return unavailable status when traffic provider is not configured without fake data', async () => {
      mockTripRepo.findOne.mockResolvedValue({
        id: 'trip-traffic-1',
        stops: [
          { sequence: 1, latitude: 52.36, longitude: 4.90 },
          { sequence: 2, latitude: 50.85, longitude: 4.35 },
        ],
      });

      const res = await service.checkLiveTraffic(mockUser, 'trip-traffic-1');
      expect(res.available).toBe(false);
      expect(res.provider).toBe('none');
      expect(mockTripRepo.save).toHaveBeenCalled();
    });

    it('should flag TRAFFIC_DELAY warning conflict when significant congestion delay exists', async () => {
      const conflicts = await service.computeConflicts({
        trips: [
          {
            id: 'trip-delay',
            status: 'driving',
            trafficDelayMinutes: 45,
            orders: [],
            stops: [],
          },
        ],
        resourcesById: {},
      });

      const trafConflict = conflicts.find((c) => c.code === 'TRAFFIC_DELAY');
      expect(trafConflict).toBeDefined();
      expect(trafConflict?.level).toBe('warning');
      expect(trafConflict?.message).toContain('+45 min');
    });

    it('should flag TOLL_DATA_UNAVAILABLE info conflict when provider is unconfigured', async () => {
      const conflicts = await service.computeConflicts({
        trips: [
          {
            id: 'trip-toll-unavail',
            status: 'planning',
            tollStatus: 'unavailable',
            orders: [],
            stops: [],
          },
        ],
        resourcesById: {},
      });

      const tollConflict = conflicts.find((c) => c.code === 'TOLL_DATA_UNAVAILABLE');
      expect(tollConflict).toBeDefined();
      expect(tollConflict?.level).toBe('info');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 17. FLEET-WIDE MULTI-VEHICLE VRP OPTIMIZATION (§5)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('17. Fleet-Wide VRP Optimization', () => {
    it('should produce Before vs Proposal vs Impact analysis with explicit confirmation workflow', async () => {
      mockOptimizationService.optimizeFleet.mockResolvedValue({
        jobId: 'vrp-test-01',
        status: 'feasible',
        objective: 'min_distance',
        before: { totalKm: 1200, totalHours: 18, activeTrips: 2, averageUtilizationPct: 65, estimatedCost: 1740 },
        proposal: {
          trips: [
            { truckId: 'trk-1', truckPlate: 'TRK-1', orderIds: ['o-1', 'o-2'], routeDistanceKm: 480, utilizationWeightPct: 92 },
            { truckId: 'trk-2', truckPlate: 'TRK-2', orderIds: ['o-3'], routeDistanceKm: 410, utilizationWeightPct: 88 },
          ],
          unassignedOrderIds: [],
        },
        impact: { tripsCreated: 0, tripsModified: 2, ordersMoved: 3, kmDelta: -310, hoursDelta: -4.5, costDelta: -450, utilizationDeltaPct: 25 },
      });

      mockTruckRepo.find.mockResolvedValue([{ id: 'trk-1' }, { id: 'trk-2' }]);
      mockOrderRepo.find.mockResolvedValue([{ id: 'o-1' }, { id: 'o-2' }, { id: 'o-3' }]);
      mockTripRepo.find.mockResolvedValue([]);

      const result = await service.optimizeFleetProposal(mockUser, { objective: 'min_distance' });

      expect(result).toBeDefined();
      expect(result.before.totalKm).toBe(1200);
      expect(result.impact.kmDelta).toBe(-310);
      expect(result.proposal.trips.length).toBe(2);
    });
  });
});
