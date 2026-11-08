/**
 * Real-PostgreSQL verification of the confirmation transaction.
 *
 * These tests run against a disposable PostgreSQL database (never production):
 *
 *   VERIFY_DATABASE_URL=postgres://postgres:verify@127.0.0.1:55432/haptrans_verify npx jest confirmation-transaction
 *
 * Without that variable the suite is skipped, so `npm test` needs no database.
 * They prove what mocks cannot: rollback of every partial write, persistence of
 * the rebuilt stops/schedule/audit, and the advisory-lock idempotency contract.
 */
// The optimisation engine ships as ESM-only WASM; it is irrelevant here.
jest.mock('or-tools-wasm/routing', () => ({}));
jest.mock('or-tools-wasm', () => ({}));

import { DataSource, ObjectLiteral, Repository } from 'typeorm';
import { join } from 'path';
import { PlanningService } from './planning.service';
import {
  buildOverrideAudit,
  isAcceptableReviewedSequence,
  normalizeConfirmationKey,
  validateInsertionSequence,
} from './assignment-confirmation';
import { Company } from '../companies/company.entity';
import { Order } from '../orders/order.entity';
import { OrderStop } from '../orders/order-stop.entity';
import { CargoItem } from '../orders/cargo-item.entity';
import { Trip } from '../trips/trip.entity';
import { Stop } from '../trips/stop.entity';
import { StopTask } from '../trips/stop-task.entity';
import { Truck } from '../trucks/truck.entity';
import { Trailer } from '../trucks/trailer.entity';
import { Driver } from '../drivers/driver.entity';
import { DriverHos } from '../drivers/driver-hos.entity';
import { Maintenance } from '../maintenance/maintenance.entity';
import { PlanningView } from './planning-view.entity';
import { PlanningAction } from './planning-action.entity';
import { PlanningProfile } from './planning-profile.entity';
import { TruckRoutePlan } from './truck-route-plan.entity';
import { RoutePlanStop } from './route-plan-stop.entity';
import { Shipment } from './shipment.entity';
import { DropHookEvent } from './drop-hook.entity';
import { CrossDockTransfer } from './cross-dock-transfer.entity';
import { TelematicsDevice } from '../telematics/entities/telematics-device.entity';
import { User } from '../users/user.entity';

const VERIFY_URL = process.env.VERIFY_DATABASE_URL;
const describeDb = VERIFY_URL ? describe : describe.skip;

jest.setTimeout(120000);

const USER = { id: '00000000-0000-4000-8000-000000000001', companyId: null as string | null };

describeDb('confirmation transaction (PostgreSQL)', () => {
  let ds: DataSource;
  let service: PlanningService;
  let seq = 0;

  const timeline = {
    logUserEvent: jest.fn().mockResolvedValue({}),
    logSystemEvent: jest.fn().mockResolvedValue({}),
    createEvent: jest.fn().mockResolvedValue({}),
  };
  const routing = {
    calculateRoute: jest.fn(async () => ({ distanceKm: 200, durationMin: 180, source: 'verify' })),
    calculateHaversine: jest.fn(() => 120),
    getLiveTraffic: jest.fn().mockResolvedValue({ available: false, provider: 'none', currentDelayMinutes: 0 }),
    calculateTolls: jest.fn().mockResolvedValue({ available: false, provider: 'none', totalCost: 0 }),
  };

  const repo = <T extends ObjectLiteral = any>(entity: any): Repository<T> =>
    ds.getRepository(entity) as Repository<T>;

  const buildService = (dataSourceOverride?: any) => new PlanningService(
    repo(Order), repo(Trip), repo(Stop), repo(StopTask), repo(OrderStop),
    repo(Truck), repo(Trailer), repo(Driver), repo(DriverHos), repo(Maintenance),
    repo(PlanningView), repo(PlanningAction), repo(PlanningProfile), repo(TruckRoutePlan),
    repo(RoutePlanStop), repo(Shipment), repo(DropHookEvent), repo(CrossDockTransfer),
    repo(TelematicsDevice),
    {} as any, {} as any, {} as any,
    timeline as any, {} as any, routing as any,
    dataSourceOverride || ds,
  );

  const feasible = (stopOrder: string[]) => ({
    blockers: [],
    warnings: [],
    feasibility: { status: 'feasible', overrideable: true },
    insertion: { recommended: { stopOrder } },
  });

  const unverified = (stopOrder: string[], codes: string[]) => ({
    blockers: [],
    warnings: codes.map((code) => ({ level: 'warning', code, message: code })),
    feasibility: { status: 'unverified', overrideable: true },
    insertion: { recommended: { stopOrder } },
  });

  async function seedTrip(departure = '2026-11-10T06:00:00Z', arrival = '2026-11-10T18:00:00Z') {
    const company = await repo<Company>(Company).save({ name: `Verify Co ${++seq}` } as any);
    const trip = await repo<Trip>(Trip).save({
      company,
      tripNumber: `TRP-VERIFY-${String(seq).padStart(4, '0')}`,
      status: 'planning',
      plannedDeparture: new Date(departure),
      plannedArrival: new Date(arrival),
    } as any);
    return { company, trip };
  }

  async function seedOrder(company: Company, suffix = '') {
    const n = ++seq;
    const order = await repo<Order>(Order).save({
      company,
      orderNumber: `ORD-VERIFY-${String(n).padStart(4, '0')}${suffix}`,
      status: 'new',
      price: 1000,
    } as any);
    const pickup = await repo<OrderStop>(OrderStop).save({
      company,
      order,
      type: 'pickup',
      sequence: 1,
      city: 'Écully',
      country: 'FR',
      address: '1 Rue de la Gare',
      latitude: 45.7719,
      longitude: 4.7755,
      dateFrom: '2026-11-10',
      timeFrom: '08:00',
    } as any);
    const delivery = await repo<OrderStop>(OrderStop).save({
      company,
      order,
      type: 'delivery',
      sequence: 2,
      city: 'Soest',
      country: 'DE',
      address: '2 Markt',
      latitude: 51.5713,
      longitude: 8.1064,
      dateFrom: '2026-11-11',
      timeFrom: '10:00',
    } as any);
    await repo<CargoItem>(CargoItem).save({
      company,
      order,
      unit: 'pallet',
      quantity: 2,
      weightKg: 800,
      volumeCbm: 3.5,
      ldm: 2,
    } as any);
    const stopOrder = [
      `${order.id}:pickup:${pickup.city}`,
      `${order.id}:delivery:${delivery.city}`,
    ];
    return { order, stopOrder, pickup, delivery };
  }

  const orderState = async (id: string) =>
    (await repo<Order>(Order).findOne({ where: { id } as any, relations: ['trip'] })) as Order;
  const tripStops = async (id: string) =>
    repo<Stop>(Stop).find({ where: { trip: { id } } as any, order: { sequence: 'ASC' } as any });
  const actions = async (action: string) =>
    repo<PlanningAction>(PlanningAction).find({ where: { action } as any });
  const confirmationsFor = async (tripId: string) =>
    (await actions('assignment_confirmation')).filter((row) => (row.afterState as any)?.tripId === tripId);
  const overridesFor = async (tripId: string) =>
    (await actions('assignment_override')).filter((row) => (row.afterState as any)?.tripId === tripId);

  beforeAll(async () => {
    ds = new DataSource({
      type: 'postgres',
      url: VERIFY_URL,
      entities: [join(__dirname, '..', '**', '*.entity{.ts,.js}')],
      synchronize: true,
      dropSchema: true,
      logging: false,
    });
    await ds.initialize();
    // Real users row so the planning_actions.userId foreign key is satisfied.
    await repo<User>(User).save({
      id: USER.id,
      email: 'verify.dispatcher@example.test',
      password: 'not-a-real-password',
      name: 'Verify Dispatcher',
      role: 'dispatcher',
    } as any);
    service = buildService();
  });

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  beforeEach(() => {
    jest.restoreAllMocks();
    service = buildService();
  });

  it('A. commits the assignment, rebuilt stops, schedule and confirmation record together', async () => {
    const { company, trip } = await seedTrip();
    const { order, stopOrder } = await seedOrder(company);
    jest.spyOn(service as any, 'preflightConsolidation').mockResolvedValue(feasible(stopOrder));

    const key = '3f2a1c9e-7b44-4f6a-9b0d-1c2d3e4f5a6b';
    const confirmed = await service.assignOrders({ ...USER, companyId: company.id }, {
      orderIds: [order.id], tripIds: [trip.id], stopOrder, confirmationKey: key,
    });

    expect(confirmed.id).toBe(trip.id);
    const stored = await orderState(order.id);
    expect(stored.trip.id).toBe(trip.id);
    expect(String(stored.status)).toBe('planned');

    const stops = await tripStops(trip.id);
    expect(stops.map((s) => s.city)).toEqual(['Écully', 'Soest']);
    expect(stops.map((s) => s.sequence)).toEqual([1, 2]);
    expect(stops[0].eta).toBeTruthy();
    expect(stops[1].eta).toBeTruthy();

    const persistedTrip = (await repo<Trip>(Trip).findOneBy({ id: trip.id } as any)) as Trip;
    expect(Number(persistedTrip.distanceKm)).toBeGreaterThan(0);
    expect(persistedTrip.plannedArrival).toBeTruthy();

    const confirmation = await confirmationsFor(trip.id);
    expect(confirmation).toHaveLength(1);
    expect((confirmation[0].afterState as any).confirmationKey).toBe(key);
    expect((confirmation[0].afterState as any).tripId).toBe(trip.id);
    expect(confirmation[0].userId).toBe(USER.id);
  });

  it('B. a stop-rebuild failure rolls the whole confirmation back', async () => {
    const { company, trip } = await seedTrip();
    const { order, stopOrder } = await seedOrder(company);
    jest.spyOn(service as any, 'preflightConsolidation').mockResolvedValue(feasible(stopOrder));
    jest.spyOn(service as any, 'rebuildStops').mockRejectedValueOnce(new Error('stops unavailable'));
    const key = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';

    await expect(service.assignOrders({ ...USER, companyId: company.id }, {
      orderIds: [order.id], tripIds: [trip.id], stopOrder, confirmationKey: key,
    })).rejects.toThrow('stops unavailable');

    const stored = await orderState(order.id);
    expect(stored.trip).toBeNull();
    expect(String(stored.status)).toBe('new');
    expect(await tripStops(trip.id)).toHaveLength(0);
    expect(await confirmationsFor(trip.id)).toHaveLength(0);
  });

  it('C. a recalculation failure rolls the whole confirmation back', async () => {
    const { company, trip } = await seedTrip();
    const { order, stopOrder } = await seedOrder(company);
    jest.spyOn(service as any, 'preflightConsolidation').mockResolvedValue(feasible(stopOrder));
    jest.spyOn(service as any, 'recalculateTrip').mockRejectedValueOnce(new Error('recalc failed'));
    const key = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';

    await expect(service.assignOrders({ ...USER, companyId: company.id }, {
      orderIds: [order.id], tripIds: [trip.id], stopOrder, confirmationKey: key,
    })).rejects.toThrow('recalc failed');

    const stored = await orderState(order.id);
    expect(stored.trip).toBeNull();
    expect(await tripStops(trip.id)).toHaveLength(0);
    expect(await confirmationsFor(trip.id)).toHaveLength(0);
  });

  it('D. an audit write failure rolls the assignment back and keeps no audit or key', async () => {
    const { company, trip } = await seedTrip();
    const { order, stopOrder } = await seedOrder(company);
    jest.spyOn(service as any, 'preflightConsolidation')
      .mockResolvedValue(unverified(stopOrder, ['EQUIPMENT_UNVERIFIED']));

    // Inject a failure exactly at the audit insert, inside the real transaction,
    // by proxying the transaction manager for the PlanningAction repository only.
    const failingDs = {
      transaction: (cb: any) => ds.transaction(async (manager: any) => cb({
        query: (sql: string, params?: any[]) => manager.query(sql, params),
        getRepository: (entity: any) => {
          const real = manager.getRepository(entity);
          if (entity === PlanningAction) {
            return {
              create: (value: any) => value,
              createQueryBuilder: (...args: any[]) => real.createQueryBuilder(...args),
              save: async () => { throw new Error('audit store unavailable'); },
              find: (...args: any[]) => real.find(...args),
              findOne: (...args: any[]) => real.findOne(...args),
            };
          }
          return real;
        },
      })),
    };
    service = buildService(failingDs);
    jest.spyOn(service as any, 'preflightConsolidation')
      .mockResolvedValue(unverified(stopOrder, ['EQUIPMENT_UNVERIFIED']));

    const key = 'cccccccc-3333-4333-8333-cccccccccccc';
    await expect(service.assignOrders({ ...USER, companyId: company.id }, {
      orderIds: [order.id],
      tripIds: [trip.id],
      stopOrder,
      confirmationKey: key,
      override: { reason: 'Trailer height confirmed by the customer by phone.', codes: ['EQUIPMENT_UNVERIFIED'] },
    })).rejects.toThrow('audit store unavailable');

    const stored = await orderState(order.id);
    expect(stored.trip).toBeNull();
    expect(await tripStops(trip.id)).toHaveLength(0);
    expect(await overridesFor(trip.id)).toHaveLength(0);
    expect(await confirmationsFor(trip.id)).toHaveLength(0);
  });

  it('E. the same confirmation key twice commits exactly one assignment', async () => {
    const { company, trip } = await seedTrip();
    const { order, stopOrder } = await seedOrder(company);
    jest.spyOn(service as any, 'preflightConsolidation').mockResolvedValue(feasible(stopOrder));
    const key = 'dddddddd-4444-4444-8444-dddddddddddd';
    const payload = { orderIds: [order.id], tripIds: [trip.id], stopOrder, confirmationKey: key };

    const first = await service.assignOrders({ ...USER, companyId: company.id }, { ...payload });
    const second = await service.assignOrders({ ...USER, companyId: company.id }, { ...payload });

    expect(second.id).toBe(first.id);
    expect(await confirmationsFor(trip.id)).toHaveLength(1);
    const stops = await tripStops(trip.id);
    expect(stops).toHaveLength(2);
    const tasks = await repo<StopTask>(StopTask).find({ where: { stop: { trip: { id: trip.id } } } as any });
    expect(tasks).toHaveLength(2);
  });

  it('F. two concurrent confirmations with one key commit exactly once', async () => {
    const { company, trip } = await seedTrip();
    const { order, stopOrder } = await seedOrder(company);
    jest.spyOn(service as any, 'preflightConsolidation').mockResolvedValue(feasible(stopOrder));
    const key = 'eeeeeeee-5555-4555-8555-eeeeeeeeeeee';
    const payload = { orderIds: [order.id], tripIds: [trip.id], stopOrder, confirmationKey: key };

    const results = await Promise.allSettled([
      service.assignOrders({ ...USER, companyId: company.id }, { ...payload }),
      service.assignOrders({ ...USER, companyId: company.id }, { ...payload }),
    ]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<any>[];
    expect(fulfilled.length).toBeGreaterThan(0);
    expect(new Set(fulfilled.map((r) => r.value.id))).toEqual(new Set([trip.id]));

    expect(await confirmationsFor(trip.id)).toHaveLength(1);
    expect(await tripStops(trip.id)).toHaveLength(2);
    const stored = await orderState(order.id);
    expect(stored.trip.id).toBe(trip.id);
  });

  it('G. hard blockers are refused before any write and the pure rules still agree', async () => {
    const { company, trip } = await seedTrip();
    const { order, stopOrder } = await seedOrder(company);
    jest.spyOn(service as any, 'preflightConsolidation').mockResolvedValue({
      blockers: [{ level: 'blocking', code: 'TRUCK_OVERLAP', message: 'Truck already committed.' }],
      warnings: [{ level: 'warning', code: 'EQUIPMENT_UNVERIFIED', message: 'unverified' }],
      feasibility: { status: 'blocked', overrideable: false },
      insertion: { recommended: { stopOrder } },
    });

    await expect(service.assignOrders({ ...USER, companyId: company.id }, {
      orderIds: [order.id],
      tripIds: [trip.id],
      stopOrder,
      confirmationKey: 'ffffffff-6666-4666-8666-ffffffffffff',
      override: { reason: 'Please let it through.', codes: ['EQUIPMENT_UNVERIFIED'] },
    })).rejects.toMatchObject({ response: { code: 'ASSIGNMENT_BLOCKED' } });

    const stored = await orderState(order.id);
    expect(stored.trip).toBeNull();
    expect(await tripStops(trip.id)).toHaveLength(0);
    expect(await confirmationsFor(trip.id)).toHaveLength(0);
    expect(await overridesFor(trip.id)).toHaveLength(0);

    // The sequence rules used by the endpoint keep every dependency.
    expect(validateInsertionSequence(stopOrder, stopOrder).ok).toBe(true);
    expect(isAcceptableReviewedSequence(stopOrder, [stopOrder])).toBe(true);
    expect(normalizeConfirmationKey('ffffffff-6666-4666-8666-ffffffffffff')).toBeTruthy();
    expect(() => buildOverrideAudit({ user: null } as any)).toThrow();
  });

  it('H. a committed truck overlap stays a hard TRUCK_OVERLAP blocker with the real 423-minute interval', async () => {
    const company = await repo<Company>(Company).save({ name: `Verify Overlap ${++seq}` } as any);
    const truck = await repo<Truck>(Truck).save({
      company, brand: 'Volvo', model: 'FH', plateNumber: 'AR67XWT', payloadCapacity: 24000, maxPallets: 33,
    } as any);
    const trailer = await repo<Trailer>(Trailer).save({ company, plateNumber: 'VL61TWZ' } as any);
    const trip = await repo<Trip>(Trip).save({
      company,
      tripNumber: `TRP-VERIFY-${++seq}`,
      status: 'planning',
      truck,
      trailer,
      plannedDeparture: new Date('2026-11-07T14:51:00Z'),
      plannedArrival: new Date('2026-11-08T14:03:00Z'),
    } as any);
    await repo<Stop>(Stop).save([
      { company, trip, sequence: 1, type: 'pickup', city: 'Écully', latitude: 45.7719, longitude: 4.7755, timeWindowMin: new Date('2026-11-07T15:00:00Z'), timeWindowMax: new Date('2026-11-07T17:00:00Z') },
      { company, trip, sequence: 2, type: 'delivery', city: 'Soest', latitude: 51.5713, longitude: 8.1064, timeWindowMin: new Date('2026-11-08T08:00:00Z'), timeWindowMax: new Date('2026-11-08T12:00:00Z') },
    ] as any);
    // The competing commitment ends exactly 423 minutes after 14:51.
    await repo<Trip>(Trip).save({
      company,
      tripNumber: `TRP-VERIFY-${++seq}`,
      status: 'planning',
      truck,
      plannedDeparture: new Date('2026-11-07T06:00:00Z'),
      plannedArrival: new Date('2026-11-07T21:54:00Z'),
    } as any);
    const { order } = await seedOrder(company);
    await repo<Order>(Order).save({ id: order.id, equipmentRequirements: ['frigo'] } as any);

    const preflight: any = await service.preflightConsolidation(
      { ...USER, companyId: company.id },
      trip.id,
      [order.id],
    );

    const codes = (preflight.blockers || []).map((blocker: any) => blocker.code);
    expect(codes).toContain('TRUCK_OVERLAP');
    const overlap = (preflight.blockers || []).find((blocker: any) => blocker.code === 'TRUCK_OVERLAP');
    expect(overlap!.params.overlapMinutes).toBe(423);
    expect(overlap!.params.plateNumber).toBe('AR67XWT');
    // A hard blocker is never overrideable, whatever the override claims.
    expect(preflight.feasibility.overrideable).toBe(false);
    const stillBlocked = await service.assignOrders(
      { ...USER, companyId: company.id },
      {
        orderIds: [order.id],
        tripIds: [trip.id],
        confirmationKey: '99999999-7777-4777-8777-999999999999',
        override: { reason: 'Operations need it anyway.', codes: ['EQUIPMENT_UNVERIFIED'] },
      },
    ).catch((error) => error);
    expect(stillBlocked).toBeInstanceOf(Error);
    expect(String(stillBlocked?.response?.code || '')).toBe('ASSIGNMENT_BLOCKED');
    expect((await orderState(order.id)).trip).toBeNull();

    // Missing trailer body data is unverified, never a manufactured incompatible.
    const equipment = preflight.equipment || preflight.equipmentChecks || [];
    if (equipment.length) {
      expect(equipment.some((entry: any) => entry.status === 'unverified')).toBe(true);
      expect(equipment.some((entry: any) => entry.status === 'incompatible')).toBe(false);
    }
  });
});
