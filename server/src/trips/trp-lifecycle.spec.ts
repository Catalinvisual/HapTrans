jest.mock('or-tools-wasm/routing', () => ({}));
jest.mock('or-tools-wasm', () => ({}));
import { BadRequestException } from '@nestjs/common';
import { PlanningService } from '../planning/planning.service';

describe('TRP Lifecycle, Validation, and Dispatch Architecture', () => {
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
      save: jest.fn((entity) => Promise.resolve(entity)),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      create: jest.fn((e) => e),
      createQueryBuilder: jest.fn(),
    };

    mockTruckRepo = {
      findOne: jest.fn(),
      save: jest.fn((e) => Promise.resolve(e)),
    };

    mockOrderRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn((e) => Promise.resolve(e)),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findByIds: jest.fn(),
    };

    mockAuditRepo = {
      save: jest.fn().mockResolvedValue({}),
      create: jest.fn((e) => e),
    };

    mockRoutePlanRepo = {
      findOne: jest.fn(),
      save: jest.fn((e) => Promise.resolve(e)),
      create: jest.fn((e) => e),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockStopRepo = {
      save: jest.fn((e) => Promise.resolve(e)),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      find: jest.fn().mockResolvedValue([]),
    };

    mockTaskRepo = {
      save: jest.fn((e) => Promise.resolve(e)),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockTimelineService = {
      logUserEvent: jest.fn().mockResolvedValue({}),
      logSystemEvent: jest.fn().mockResolvedValue({}),
    };

    // Instantiate PlanningService with mocked repositories in exact parameter order
    service = new PlanningService(
      mockOrderRepo,          // 0: orderRepo
      mockTripRepo,           // 1: tripRepo
      mockStopRepo,           // 2: stopRepo
      mockTaskRepo,           // 3: taskRepo
      {} as any,              // 4: orderStopRepo
      mockTruckRepo,          // 5: truckRepo
      {} as any,              // 6: trailerRepo
      {} as any,              // 7: driverRepo
      {} as any,              // 8: hosRepo
      {} as any,              // 9: maintRepo
      {} as any,              // 10: viewRepo
      mockAuditRepo,          // 11: planningActionRepo
      {} as any,              // 12: profileRepo
      mockRoutePlanRepo,      // 13: routePlanRepo
      {} as any,              // 14: routePlanStopRepo
      {} as any,              // 15: shipmentRepo
      {} as any,              // 16: planningEngine
      {} as any,              // 17: optimizationEngine
      {} as any,              // 18: pricingEngine
      mockTimelineService,    // 19: timelineService
      {} as any,              // 20: optimizationService
      {} as any,              // 21: routingService
    );
  });

  describe('1. Equipment Enforcement & Feasibility Validation', () => {
    it('should flag blocking conflict and status not_feasible when order requires frigo and truck is standard curtain', async () => {
      const mockTrip = {
        id: 'trip-001',
        companyId: 'comp-01',
        tripNumber: 'TRP-2026-0001',
        status: 'planning',
        truck: {
          id: 'truck-curtain',
          plateNumber: 'B-100-CURTAIN',
          truckType: 'curtainsider',
          features: ['gps'],
          payloadCapacity: 24000,
          maxPallets: 33,
        },
        trailer: {
          id: 'trailer-curtain',
          plateNumber: 'B-200-TRAILER',
          type: 'curtainsider',
          features: [],
        },
        orders: [
          {
            id: 'ord-frigo-1',
            orderNumber: 'ORD-F001',
            status: 'assigned',
            equipmentRequirements: ['frigo'],
            cargoItems: [{ weightKg: 10000, pallets: 15, requiresTemperatureControl: true }],
            stops: [
              { id: 's1', type: 'pickup', sequence: 1, dateFrom: '2026-08-20T08:00:00Z' },
              { id: 's2', type: 'delivery', sequence: 2, dateFrom: '2026-08-20T16:00:00Z' },
            ],
          },
        ],
        stops: [
          { id: 's1', orderId: 'ord-frigo-1', type: 'pickup', sequence: 1 },
          { id: 's2', orderId: 'ord-frigo-1', type: 'delivery', sequence: 2 },
        ],
      };

      mockTripRepo.findOne.mockResolvedValue(mockTrip);

      const result = await service.validateTrip(mockUser, 'trip-001');

      expect(result.validationStatus).toBe('not_feasible');
      expect(result.conflicts.length).toBeGreaterThan(0);
      const frigoConflict = result.conflicts.find((c: any) => c.code === 'ERR_FRIGO_REQUIRED');
      expect(frigoConflict).toBeDefined();
      expect(frigoConflict?.blocking).toBe(true);
    });

    it('should pass with feasible status when truck/trailer has required equipment', async () => {
      const mockTrip = {
        id: 'trip-002',
        companyId: 'comp-01',
        tripNumber: 'TRP-2026-0002',
        status: 'planning',
        truck: {
          id: 'truck-frigo',
          plateNumber: 'B-100-FRIGO',
          truckType: 'refrigerated',
          features: ['frigo', 'lift'],
          payloadCapacity: 22000,
          maxPallets: 33,
        },
        orders: [
          {
            id: 'ord-frigo-2',
            orderNumber: 'ORD-F002',
            status: 'assigned',
            equipmentRequirements: ['frigo'],
            cargoItems: [{ weightKg: 12000, pallets: 20 }],
            stops: [
              { id: 's1', type: 'pickup', sequence: 1, dateFrom: '2026-08-20T08:00:00Z' },
              { id: 's2', type: 'delivery', sequence: 2, dateFrom: '2026-08-20T16:00:00Z' },
            ],
          },
        ],
        stops: [
          { id: 's1', orderId: 'ord-frigo-2', type: 'pickup', sequence: 1 },
          { id: 's2', orderId: 'ord-frigo-2', type: 'delivery', sequence: 2 },
        ],
      };

      mockTripRepo.findOne.mockResolvedValue(mockTrip);

      const result = await service.validateTrip(mockUser, 'trip-002');

      expect(result.validationStatus).toBe('feasible');
      expect(result.conflicts.length).toBe(0);
    });
  });

  describe('2. Confirm Plan & Locking', () => {
    it('should reject confirmTrip when blocking validation issues exist', async () => {
      const mockTrip = {
        id: 'trip-unfeasible',
        companyId: 'comp-01',
        status: 'planning',
        truck: { id: 'truck-1', payloadCapacity: 10000 },
        orders: [
          {
            id: 'ord-heavy',
            equipmentRequirements: ['frigo'],
            cargoItems: [{ weightKg: 15000 }],
          },
        ],
        stops: [],
      };

      mockTripRepo.findOne.mockResolvedValue(mockTrip);

      await expect(service.confirmTrip(mockUser, 'trip-unfeasible')).rejects.toThrow(BadRequestException);
    });

    it('should confirm trip, lock planning, and transition order statuses to planned when feasible', async () => {
      const mockTrip = {
        id: 'trip-good',
        companyId: 'comp-01',
        status: 'planning',
        truck: { id: 'truck-1', payloadCapacity: 24000, features: ['frigo', 'lift'] },
        orders: [
          {
            id: 'ord-1',
            equipmentRequirements: ['frigo'],
            cargoItems: [{ weightKg: 8000, pallets: 12 }],
            stops: [
              { id: 's1', type: 'pickup', sequence: 1 },
              { id: 's2', type: 'delivery', sequence: 2 },
            ],
          },
        ],
        stops: [
          { id: 's1', orderId: 'ord-1', type: 'pickup', sequence: 1 },
          { id: 's2', orderId: 'ord-1', type: 'delivery', sequence: 2 },
        ],
      };

      mockTripRepo.findOne.mockResolvedValue(mockTrip);

      const confirmed = await service.confirmTrip(mockUser, 'trip-good');

      expect(confirmed.status).toBe('confirmed');
      expect(confirmed.confirmedAt).toBeDefined();
      expect(mockOrderRepo.save).toHaveBeenCalled();
    });
  });

  describe('3. Reopen Planning', () => {
    it('should allow reopening confirmed trip back to planning state', async () => {
      const mockTrip = {
        id: 'trip-confirmed',
        companyId: 'comp-01',
        status: 'confirmed',
        confirmedAt: new Date(),
        confirmedBy: { id: 'user-01' },
        validationStatus: 'feasible',
      };

      mockTripRepo.findOne.mockResolvedValue(mockTrip);

      const reopened = await service.reopenPlanning(mockUser, 'trip-confirmed');

      expect(reopened.status).toBe('planning');
      expect(reopened.validationOutdated).toBe(true);
      expect(reopened.confirmedAt).toBeNull();
    });

    it('should reject reopening trips that are already dispatched or active', async () => {
      const mockTrip = {
        id: 'trip-dispatched',
        companyId: 'comp-01',
        status: 'dispatched',
      };

      mockTripRepo.findOne.mockResolvedValue(mockTrip);

      await expect(service.reopenPlanning(mockUser, 'trip-dispatched')).rejects.toThrow(BadRequestException);
    });
  });

  describe('4. Dispatch & Versioning', () => {
    it('should reject sendToDriver if trip is not confirmed yet', async () => {
      const mockTrip = {
        id: 'trip-planning',
        companyId: 'comp-01',
        status: 'planning',
      };

      mockTripRepo.findOne.mockResolvedValue(mockTrip);

      await expect(service.sendToDriver(mockUser, 'trip-planning', {})).rejects.toThrow(BadRequestException);
    });

    it('should dispatch confirmed trip with v1, and increment to v2 on redispatch update', async () => {
      const mockTrip = {
        id: 'trip-ready',
        companyId: 'comp-01',
        tripNumber: 'TRP-DISP-001',
        status: 'confirmed',
        dispatchVersion: 0,
        driver: { id: 'd1', name: 'Liviu Muresan' },
        truck: { id: 't1', plateNumber: 'B-100-HAP' },
        orders: [{ id: 'o1' }],
        stops: [{ id: 's1' }, { id: 's2' }],
      };

      mockTripRepo.findOne.mockResolvedValue(mockTrip);

      // 1st dispatch from confirmed -> v1
      const dispatched = await service.sendToDriver(mockUser, 'trip-ready', { instructions: 'Handle with care' });

      expect(dispatched.status).toBe('dispatched');
      expect(dispatched.dispatchVersion).toBe(1);
      expect(dispatched.dispatchedAt).toBeDefined();
      expect(dispatched.trackingActivated).toBe(true);
      expect(mockOrderRepo.save).toHaveBeenCalled();

      // 2nd dispatch (update) when already dispatched -> v2
      mockTrip.status = 'dispatched';
      mockTrip.dispatchVersion = 1;
      const reDispatched = await service.sendToDriver(mockUser, 'trip-ready', { instructions: 'Route update' });
      expect(reDispatched.dispatchVersion).toBe(2);
    });
  });

  describe('5. Unassign Order vs Unplan Trip', () => {
    it('should unassign a single order and keep remaining trip orders in planning', async () => {
      const mockTrip = {
        id: 'trip-multi',
        companyId: 'comp-01',
        status: 'planning',
        orders: [
          { id: 'o1', orderNumber: 'ORD-1' },
          { id: 'o2', orderNumber: 'ORD-2' },
        ],
        stops: [
          { id: 's1', orderId: 'o1', type: 'pickup', sequence: 1 },
          { id: 's2', orderId: 'o2', type: 'pickup', sequence: 2 },
          { id: 's3', orderId: 'o1', type: 'delivery', sequence: 3 },
          { id: 's4', orderId: 'o2', type: 'delivery', sequence: 4 },
        ],
      };

      mockTripRepo.findOne.mockResolvedValue(mockTrip);
      mockOrderRepo.findOne.mockResolvedValue({ id: 'o1', trip: mockTrip });

      await service.unassignOrder(mockUser, 'trip-multi', 'o1');

      expect(mockOrderRepo.save).toHaveBeenCalled();
      expect(mockStopRepo.delete).toHaveBeenCalled();
    });

    it('should unplan entire trip and return all orders to pool', async () => {
      const mockTrip = {
        id: 'trip-unplan',
        companyId: 'comp-01',
        status: 'planning',
        orders: [
          { id: 'o1' },
          { id: 'o2' },
        ],
        stops: [{ id: 's1' }, { id: 's2' }],
      };

      mockTripRepo.findOne.mockResolvedValue(mockTrip);

      const result = await service.unplanTrip(mockUser, 'trip-unplan');

      expect(result.unassignedOrdersCount).toBe(2);
      expect(mockOrderRepo.save).toHaveBeenCalled();
      expect(mockTripRepo.delete).toHaveBeenCalledWith({ id: 'trip-unplan' });
    });

    it('should reject unassignOrder or unplanTrip on confirmed trip without reopen', async () => {
      const mockTrip = {
        id: 'trip-locked',
        companyId: 'comp-01',
        status: 'confirmed',
      };

      mockTripRepo.findOne.mockResolvedValue(mockTrip);

      await expect(service.unassignOrder(mockUser, 'trip-locked', 'o1')).rejects.toThrow(BadRequestException);
      await expect(service.unplanTrip(mockUser, 'trip-locked')).rejects.toThrow(BadRequestException);
    });
  });
});
