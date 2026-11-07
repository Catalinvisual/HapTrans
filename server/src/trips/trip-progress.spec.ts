import {
  assertActorMayOperateTrip,
  assertStopTransition,
  deriveOrderStatusForStop,
  deriveTripStatus,
  driverTripAction,
  isTripAccepted,
  resolveStatusSource,
  timestampsForStop,
} from './trip-progress';
import { ForbiddenException, ConflictException } from '@nestjs/common';

const driverUser = { id: 'user-1', role: 'driver' };
const otherUser = { id: 'user-2', role: 'driver' };
const dispatcher = { id: 'user-9', role: 'admin' };

const tripWithDriver = {
  id: 'trip-1',
  driver: { id: 'driver-1', user: { id: 'user-1' } },
  truck: { id: 'truck-1', driver: { user: { id: 'user-1' } } },
};

describe('trip-progress lifecycle', () => {
  it('attributes the change source from the authenticated role', () => {
    expect(resolveStatusSource(driverUser)).toBe('mobile');
    expect(resolveStatusSource(dispatcher)).toBe('tms');
    expect(resolveStatusSource(null)).toBe('system');
  });

  it('lets the assigned driver operate the trip, even when assigned by truck', () => {
    expect(() => assertActorMayOperateTrip(tripWithDriver, driverUser)).not.toThrow();
    expect(() => assertActorMayOperateTrip(tripWithDriver, dispatcher)).not.toThrow();
  });

  it('rejects a second driver acting on a trip that is not theirs', () => {
    expect(() => assertActorMayOperateTrip(tripWithDriver, otherUser)).toThrow(ForbiddenException);
  });

  it('enforces the pickup and delivery action order', () => {
    expect(() => assertStopTransition('pickup', 'pending', 'arrived')).not.toThrow();
    expect(() => assertStopTransition('pickup', 'arrived', 'loading')).not.toThrow();
    expect(() => assertStopTransition('pickup', 'loading', 'completed')).not.toThrow();
    expect(() => assertStopTransition('delivery', 'arrived', 'unloading')).not.toThrow();
    expect(() => assertStopTransition('delivery', 'unloading', 'completed')).not.toThrow();
    // skipping arrival, or unloading a pickup, is impossible
    expect(() => assertStopTransition('pickup', 'pending', 'completed')).toThrow(ConflictException);
    expect(() => assertStopTransition('pickup', 'arrived', 'unloading')).toThrow(ConflictException);
    expect(() => assertStopTransition('delivery', 'completed', 'arrived')).toThrow(ConflictException);
  });

  it('records the real timestamp of each milestone', () => {
    const at = new Date('2026-11-05T10:00:00.000Z');
    expect(timestampsForStop('arrived', at)).toEqual({ ata: at });
    expect(timestampsForStop('loading', at)).toEqual({ loadingStartedAt: at });
    expect(timestampsForStop('unloading', at)).toEqual({ unloadingStartedAt: at });
    expect(timestampsForStop('completed', at)).toEqual({ completedAt: at });
  });

  it('moves the order with the stop instead of leaving it at assigned', () => {
    expect(deriveOrderStatusForStop('pickup', 'arrived')).toBe('loading');
    expect(deriveOrderStatusForStop('pickup', 'loading')).toBe('loading');
    expect(deriveOrderStatusForStop('pickup', 'completed')).toBe('in_transit');
    expect(deriveOrderStatusForStop('delivery', 'arrived')).toBe('in_transit');
    // Arrival and unloading are not delivery: only a completed, POD-backed
    // stop may move the order to delivered.
    expect(deriveOrderStatusForStop('delivery', 'unloading')).toBe('in_transit');
    expect(deriveOrderStatusForStop('delivery', 'completed')).toBe('delivered');
  });

  it('derives the trip stage from the stops, and keeps partial deliveries partial', () => {
    const pickup = { sequence: 1, type: 'pickup', status: 'pending' };
    const delivery = { sequence: 2, type: 'delivery', status: 'pending' };

    expect(deriveTripStatus([pickup, delivery])).toBe('started');
    expect(deriveTripStatus([{ ...pickup, status: 'arrived' }, delivery])).toBe('loading');
    expect(deriveTripStatus([{ ...pickup, status: 'completed' }, delivery])).toBe('driving');
    expect(
      deriveTripStatus([
        { ...pickup, status: 'completed' },
        { ...delivery, status: 'arrived' },
      ]),
    ).toBe('driving');
    expect(
      deriveTripStatus([
        { ...pickup, status: 'completed' },
        { ...delivery, status: 'completed' },
      ]),
    ).toBe('completed');
    // one of two deliveries done is not a completed trip
    expect(
      deriveTripStatus([
        { ...pickup, status: 'completed' },
        { ...delivery, status: 'completed' },
        { sequence: 3, type: 'delivery', status: 'pending' },
      ]),
    ).toBe('partially_delivered');
  });

  it('offers accept only before acceptance and never for an accepted trip', () => {
    const stops = [{ id: 's1', sequence: 1, type: 'pickup', status: 'pending' }];
    const planned = { status: 'dispatched', operationalStatus: 'PLANNING', stops };
    const accepted = { status: 'driver_accepted', operationalStatus: 'ACCEPTED', stops };

    expect(driverTripAction(planned, stops)).toMatchObject({ kind: 'accept' });
    expect(isTripAccepted(planned)).toBe(false);
    expect(isTripAccepted(accepted)).toBe(true);
    // Regression: the previously observed Accepted / Accept trip defect.
    expect(driverTripAction(accepted, stops)).toMatchObject({ kind: 'start', status: 'started' });
    expect(driverTripAction(accepted, stops)?.kind).not.toBe('accept');
  });

  it('derives only the valid next action for every operational stage', () => {
    const pendingPickup = [{ id: 's1', sequence: 1, type: 'pickup', status: 'pending' }];
    const arrivedPickup = [{ id: 's1', sequence: 1, type: 'pickup', status: 'arrived' }];
    const loading = [{ id: 's1', sequence: 1, type: 'pickup', status: 'loading' }];
    const toDelivery = [
      { id: 's1', sequence: 1, type: 'pickup', status: 'completed' },
      { id: 's2', sequence: 2, type: 'delivery', status: 'pending' },
    ];
    const arrivedDelivery = [
      { id: 's1', sequence: 1, type: 'pickup', status: 'completed' },
      { id: 's2', sequence: 2, type: 'delivery', status: 'arrived' },
    ];
    const unloading = [
      { id: 's1', sequence: 1, type: 'pickup', status: 'completed' },
      { id: 's2', sequence: 2, type: 'delivery', status: 'unloading' },
    ];

    expect(driverTripAction({ status: 'started', operationalStatus: 'EN_ROUTE_TO_PICKUP', stops: pendingPickup }, pendingPickup)?.kind).toBe('arrive_pickup');
    expect(driverTripAction({ status: 'loading', operationalStatus: 'ARRIVED_AT_PICKUP', stops: arrivedPickup }, arrivedPickup)?.kind).toBe('start_loading');
    expect(driverTripAction({ status: 'loading', operationalStatus: 'LOADING', stops: loading }, loading)?.kind).toBe('complete_loading');
    expect(driverTripAction({ status: 'driving', operationalStatus: 'EN_ROUTE_TO_DELIVERY', stops: toDelivery }, toDelivery)?.kind).toBe('arrive_delivery');
    expect(driverTripAction({ status: 'driving', operationalStatus: 'ARRIVED_AT_DELIVERY', stops: arrivedDelivery }, arrivedDelivery)?.kind).toBe('start_unloading');
    expect(driverTripAction({ status: 'unloading', operationalStatus: 'UNLOADING', stops: unloading }, unloading)?.kind).toBe('complete_delivery');
    expect(driverTripAction({ status: 'completed', operationalStatus: 'COMPLETED', stops: unloading.map((s) => ({ ...s, status: 'completed' })) })).toBeNull();
  });
});
