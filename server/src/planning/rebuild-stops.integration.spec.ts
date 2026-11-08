/**
 * Real-PostgreSQL verification of the route-plan stop rebuild.
 *
 * Reproduces the legacy shape that made the route planner report "0 stops" while
 * Planning still listed stops: a trip with an assigned truck, persisted stops and
 * stop_tasks, but no `orders.tripId` link (so `trip.orders` is empty).
 *
 *   VERIFY_DATABASE_URL=postgres://postgres:x@127.0.0.1:55432/haptrans_verify npx jest rebuild-stops
 *
 * Without that variable the suite is skipped.
 */
jest.mock('or-tools-wasm/routing', () => ({}));
jest.mock('or-tools-wasm', () => ({}));

import { DataSource, ObjectLiteral, Repository } from 'typeorm';
import { join } from 'path';
import { PlanningService } from './planning.service';
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

describeDb('route-plan stop rebuild (PostgreSQL)', () => {
  let ds: DataSource;
  let service: PlanningService;
  let routing: any;

  const repo = <T extends ObjectLiteral = any>(entity: any): Repository<T> =>
    ds.getRepository(entity) as Repository<T>;

  const buildService = () => new PlanningService(
    repo(Order), repo(Trip), repo(Stop), repo(StopTask), repo(OrderStop),
    repo(Truck), repo(Trailer), repo(Driver), repo(DriverHos), repo(Maintenance),
    repo(PlanningView), repo(PlanningAction), repo(PlanningProfile), repo(TruckRoutePlan),
    repo(RoutePlanStop), repo(Shipment), repo(DropHookEvent), repo(CrossDockTransfer),
    repo(TelematicsDevice),
    {} as any, {} as any, {} as any,
    { logUserEvent: jest.fn(), logSystemEvent: jest.fn(), createEvent: jest.fn() } as any,
    {} as any, routing,
    ds,
  );

  let seq = 0;

  /** The legacy trip: truck + stops + tasks, but no orders.tripId link. */
  async function seedLegacyTrip() {
    const n = ++seq;
    const company = await repo<Company>(Company).save({ name: `Rebuild Co ${n}` } as any);
    const truck = await repo<Truck>(Truck).save({
      company, plateNumber: `CJ-${90 + n}-TRK`, brand: 'Renault', model: 'T480', status: 'active',
    } as any);
    const trip = await repo<Trip>(Trip).save({
      company, truck, tripNumber: `TRP-REBUILD-${n}`, status: 'planning',
      plannedDeparture: new Date('2026-11-10T06:00:00Z'), plannedArrival: new Date('2026-11-11T18:00:00Z'),
    } as any);
    const order = await repo<Order>(Order).save({
      company, orderNumber: `ORD-REBUILD-${n}`, status: 'planned',
      // Deliberately no trip link: this is the legacy assignment shape.
    } as any);
    await repo<OrderStop>(OrderStop).save({
      company, order, type: 'pickup', sequence: 1, city: 'Écully', country: 'FR',
      address: '1 Rue de la Gare', latitude: 45.7719, longitude: 4.7755,
      dateFrom: '2026-11-10', timeFrom: '08:00',
    } as any);
    await repo<OrderStop>(OrderStop).save({
      company, order, type: 'delivery', sequence: 2, city: 'Soest', country: 'DE',
      address: '2 Markt', latitude: 51.5713, longitude: 8.1064,
      dateFrom: '2026-11-11', timeFrom: '10:00',
    } as any);
    await repo<CargoItem>(CargoItem).save({
      company, order, unit: 'pallet', quantity: 2, weightKg: 800, volumeCbm: 3.5, ldm: 2,
    } as any);

    const weekday = new Date('2026-11-10T07:00:00Z');
    const pickupStop = await repo<Stop>(Stop).save({
      company, trip, type: 'pickup', sequence: 1, city: 'Écully', country: 'FR',
      address: '1 Rue de la Gare', latitude: 45.7719, longitude: 4.7755,
      timeWindowMin: weekday, timeWindowMax: weekday,
    } as any);
    const deliveryStop = await repo<Stop>(Stop).save({
      company, trip, type: 'delivery', sequence: 2, city: 'Soest', country: 'DE',
      address: '2 Markt', latitude: 51.5713, longitude: 8.1064,
      timeWindowMin: new Date('2026-11-11T09:00:00Z'), timeWindowMax: new Date('2026-11-11T09:00:00Z'),
    } as any);
    await repo<StopTask>(StopTask).save({ company, stop: pickupStop, order, type: 'load', status: 'pending' } as any);
    await repo<StopTask>(StopTask).save({ company, stop: deliveryStop, order, type: 'unload', status: 'pending' } as any);

    return { company, truck, trip, order, pickupStop, deliveryStop };
  }

  const tripStops = (tripId: string) =>
    repo<Stop>(Stop).find({ where: { trip: { id: tripId } } as any, order: { sequence: 'ASC' } as any });

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
    await repo<User>(User).save({
      id: '00000000-0000-4000-8000-000000000001',
      email: 'verify.rebuild@example.test',
      password: 'not-a-real-password',
      name: 'Verify Dispatcher',
      role: 'dispatcher',
    } as any);
    routing = {
      calculateRoute: jest.fn(async () => ({ distanceKm: 900, durationMin: 600, source: 'verify' })),
      calculateHaversine: jest.fn(() => 120),
      calculateTruckRoadRoute: jest.fn(async () => ({
        provider: 'verify',
        coordinates: [[4.7755, 45.7719], [8.1064, 51.5713]],
        distanceKm: 900,
        durationMin: 600,
        legs: [{ distanceKm: 900, durationMin: 600 }],
      })),
      getLastRouteFailure: jest.fn(() => ({ provider: 'verify', code: 'provider_unavailable' })),
      getLiveTraffic: jest.fn().mockResolvedValue({ available: false, provider: 'none', currentDelayMinutes: 0 }),
      calculateTolls: jest.fn().mockResolvedValue({ available: false, provider: 'none', totalCost: 0 }),
    };
    service = buildService();
  });

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  it('rebuilds the stops of a trip whose orders are only linked through stop tasks', async () => {
    const { trip, order } = await seedLegacyTrip();
    const linked = await repo<Order>(Order).findOne({ where: { id: order.id } as any, relations: ['trip'] });
    expect((linked as any).trip).toBeNull();

    await (service as any).rebuildStops(trip.id);

    const stops = await tripStops(trip.id);
    expect(stops).toHaveLength(2);
    expect(stops.map((s) => s.type)).toEqual(['pickup', 'delivery']);
    expect(stops[0].city).toBe('Écully');
    expect(stops[1].city).toBe('Soest');
    expect(stops[0].latitude).toBeTruthy();
    expect(stops[1].longitude).toBeTruthy();
  });

  it('is idempotent: rebuilding again keeps exactly the same stop identities', async () => {
    const { trip } = await seedLegacyTrip();
    await (service as any).rebuildStops(trip.id);
    const first = (await tripStops(trip.id)).map((s) => `${s.sequence}:${s.type}:${s.city}`);
    await (service as any).rebuildStops(trip.id);
    const second = await tripStops(trip.id);
    expect(second).toHaveLength(first.length);
    expect(second.map((s) => `${s.sequence}:${s.type}:${s.city}`)).toEqual(first);
  });

  it('keeps the stops when the routing provider fails', async () => {
    const { trip } = await seedLegacyTrip();
    routing.calculateTruckRoadRoute.mockResolvedValueOnce(null);

    await (service as any).rebuildStops(trip.id);

    const stops = await tripStops(trip.id);
    expect(stops).toHaveLength(2);
    expect(stops.map((s) => s.type)).toEqual(['pickup', 'delivery']);
  });

  it('does not duplicate stops when the order is also linked through orders.tripId', async () => {
    const { trip, order } = await seedLegacyTrip();
    await repo<Order>(Order).update({ id: order.id } as any, { trip: { id: trip.id } as any } as any);

    await (service as any).rebuildStops(trip.id);

    const stops = await tripStops(trip.id);
    expect(stops).toHaveLength(2);
    expect(stops.map((s) => s.city)).toEqual(['Écully', 'Soest']);
  });

  it('rebuilds one operation once when the order carries duplicated stop rows', async () => {
    // The production shape behind "Stop Sequence (44)": the same pickup and the
    // same delivery written several times as separate records.
    const { company, trip, order } = await seedLegacyTrip();
    for (let copy = 0; copy < 4; copy += 1) {
      await repo<OrderStop>(OrderStop).save({
        company, order, type: 'pickup', sequence: 1, city: 'Écully', country: 'FR',
        address: '1 Rue de la Gare', latitude: 45.7719, longitude: 4.7755,
        dateFrom: '2026-11-10', timeFrom: '08:00',
      } as any);
      await repo<OrderStop>(OrderStop).save({
        company, order, type: 'delivery', sequence: 2, city: 'Soest', country: 'DE',
        address: '2 Markt', latitude: 51.5713, longitude: 8.1064,
        dateFrom: '2026-11-11', timeFrom: '10:00',
      } as any);
    }

    await (service as any).rebuildStops(trip.id);

    const stops = await tripStops(trip.id);
    expect(stops).toHaveLength(2);
    expect(stops.map((s) => `${s.type}:${s.city}`)).toEqual(['pickup:Écully', 'delivery:Soest']);

    // A second rebuild must not resurrect the copies from the order rows.
    await (service as any).rebuildStops(trip.id);
    expect(await tripStops(trip.id)).toHaveLength(2);
  });
});
