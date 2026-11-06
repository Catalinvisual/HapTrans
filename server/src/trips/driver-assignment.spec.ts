import { NotFoundException } from '@nestjs/common';
import { resolveTripDriver, resolveTripDriverAssignment, resolveTripTrailer } from './driver-assignment';
import { DriverTripsService } from '../driver/driver-trips.service';

function queryRecorder(result: any) {
  const calls: { joins: string[]; where: any[]; andWhere: any[]; orderBy: any[] } = {
    joins: [],
    where: [],
    andWhere: [],
    orderBy: [],
  };
  const qb: any = {
    leftJoinAndSelect(relation: string) { calls.joins.push(relation); return qb; },
    where(sql: string, params?: any) { calls.where.push({ sql, params }); return qb; },
    andWhere(sql: string, params?: any) { calls.andWhere.push({ sql, params }); return qb; },
    orderBy(...args: any[]) { calls.orderBy.push(args); return qb; },
    async getMany() { return result; },
    async getOne() { return result; },
  };
  return { qb, calls };
}

function buildService(qb: any) {
  return new DriverTripsService(
    { createQueryBuilder: () => qb } as any,
    {} as any,
    {} as any,
    {} as any,
  );
}

describe('resolveTripDriver / resolveTripTrailer', () => {
  it('prefers the trip assignment', () => {
    const trip = { driver: { id: 'trip-driver' }, truck: { driver: { id: 'truck-driver' }, trailer: { plateNumber: 'T1' } } };
    expect(resolveTripDriver(trip).id).toBe('trip-driver');
    expect(resolveTripTrailer(trip).plateNumber).toBe('T1');
  });

  it('falls back to the truck driver when the trip has none', () => {
    const trip = { driver: null, truck: { driver: { id: 'truck-driver' }, trailer: { id: 'truck-trailer' } } };
    expect(resolveTripDriver(trip).id).toBe('truck-driver');
    expect(resolveTripTrailer(trip).id).toBe('truck-trailer');
  });

  it('returns null when nothing is assigned', () => {
    expect(resolveTripDriver({})).toBeNull();
    expect(resolveTripTrailer({ driver: null, truck: null })).toBeNull();
  });

  it('reports a direct trip driver as the confirmed trip assignment', () => {
    const trip = { driver: { id: 'trip-driver' }, truck: { driver: { id: 'truck-driver' } } };
    expect(resolveTripDriverAssignment(trip)).toEqual({
      driver: trip.driver,
      source: 'trip',
      confirmed: true,
    });
  });

  it('confirms the assigned truck driver when the trip has no direct driver', () => {
    const trip = { driver: null, truck: { driver: { id: 'truck-driver' } } };
    expect(resolveTripDriverAssignment(trip)).toEqual({
      driver: trip.truck.driver,
      source: 'truck',
      confirmed: true,
    });
  });

  it('never invents a driver when neither the trip nor its truck has one', () => {
    expect(resolveTripDriverAssignment({ driver: null, truck: { driver: null } })).toEqual({
      driver: null,
      source: null,
      confirmed: false,
    });
  });
});

describe('DriverTripsService scoping', () => {
  it('scopes trips to the authenticated user through the trip or truck driver', async () => {
    const { qb, calls } = queryRecorder([{ id: 'trip-1' }]);
    const trips = await buildService(qb).findMyTrips('user-gabriel');

    expect(trips).toHaveLength(1);
    const predicate = String(calls.where[0]?.sql || '');
    expect(predicate).toContain('driverUser.id');
    expect(predicate).toContain('truckDriverUser.id');
    expect(calls.where[0]?.params).toEqual({ userId: 'user-gabriel' });
    expect(calls.joins).toEqual(expect.arrayContaining(['trip.driver', 'driver.user', 'truck.driver', 'truckDriver.user', 'trip.orders']));
  });

  it('never trusts a client supplied driver id', async () => {
    const { qb, calls } = queryRecorder([]);
    await buildService(qb).findMyTrips('token-user');

    expect(calls.where[0]?.params.userId).toBe('token-user');
    expect(calls.where[0]?.params.driverId).toBeUndefined();
  });

  it('does not reveal a trip that belongs to another driver', async () => {
    const { qb, calls } = queryRecorder(null);
    const service = buildService(qb);

    await expect(service.findMyTrip('user-other', 'trip-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(calls.andWhere[0]?.params).toEqual({ id: 'trip-1' });
  });
});
