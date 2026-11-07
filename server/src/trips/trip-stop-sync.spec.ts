import { TripsService } from './trips.service';
import { ConflictException, ForbiddenException } from '@nestjs/common';

/**
 * Proves that one driver action is written to every record the TMS reads:
 * the stop, the trip stage, the order and the audit trail (with its source).
 */
describe('TripsService.updateStopStatus — driver action synchronisation', () => {
  const driverUser = { id: 'user-1', role: 'driver' };
  const otherDriver = { id: 'user-2', role: 'driver' };

  let stop: any;
  let delivery: any;
  let trip: any;
  let repo: any;
  let actionLogs: any;
  let service: TripsService;

  beforeEach(() => {
    trip = {
      id: 'trip-1',
      status: 'driver_accepted',
      podRequired: false,
      actualDeparture: null,
      actualArrival: null,
      driver: { id: 'driver-1', user: { id: 'user-1' } },
      truck: { id: 'truck-1', driver: { user: { id: 'user-1' } } },
    };
    stop = {
      id: 'stop-1',
      type: 'pickup',
      status: 'pending',
      sequence: 1,
      trip,
      tasks: [{ id: 'task-1', order: { id: 'order-1' } }],
    };
    delivery = {
      id: 'stop-2',
      type: 'delivery',
      status: 'pending',
      sequence: 2,
      trip,
      tasks: [{ id: 'task-2', order: { id: 'order-1' } }],
    };

    repo = {
      manager: {
        findOne: jest.fn(async (_entity: string, opts: any) =>
          opts?.where?.id === 'stop-2' ? delivery : stop,
        ),
        find: jest.fn(async () => [stop, delivery]),
        save: jest.fn(async (_entity: string, value: any) => value),
        update: jest.fn(async () => ({ affected: 1 })),
      },
      update: jest.fn(async () => ({ affected: 1 })),
      findOne: jest.fn(async () => trip),
      query: jest.fn(async () => []),
    };
    actionLogs = { logAction: jest.fn(async () => ({})) };

    service = new TripsService(
      repo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      actionLogs as any,
    );
  });

  it('moves the pickup stop, the trip stage and the order together', async () => {
    await service.updateStopStatus('stop-1', 'arrived', driverUser);

    expect(stop.status).toBe('arrived');
    expect(stop.ata).toBeInstanceOf(Date);
    // trip leaves "accepted" as soon as the driver is at the loading site
    expect(repo.update).toHaveBeenCalledWith('trip-1', expect.objectContaining({ status: 'loading' }));
    expect(repo.manager.update).toHaveBeenCalledWith('Order', { id: 'order-1' }, expect.objectContaining({ status: 'loading', operationalStatus: 'ARRIVED_AT_PICKUP' }));

    await service.updateStopStatus('stop-1', 'loading', driverUser);
    expect(stop.loadingStartedAt).toBeInstanceOf(Date);

    await service.updateStopStatus('stop-1', 'completed', driverUser);
    expect(stop.status).toBe('completed');
    expect(stop.completedAt).toBeInstanceOf(Date);
    // pickup done => driving to delivery, order in transit, departure recorded
    expect(repo.update).toHaveBeenCalledWith('trip-1', expect.objectContaining({ status: 'driving' }));
    expect(repo.manager.update).toHaveBeenCalledWith('Order', { id: 'order-1' }, expect.objectContaining({ status: 'in_transit', operationalStatus: 'EN_ROUTE_TO_DELIVERY' }));
    expect(repo.update).toHaveBeenCalledWith('trip-1', expect.objectContaining({ actualDeparture: expect.any(Date) }));
  });

  it('records who changed which stop, with the source derived from the account', async () => {
    await service.updateStopStatus('stop-1', 'arrived', driverUser);

    expect(actionLogs.logAction).toHaveBeenCalledTimes(1);
    const [entityType, entityId, action, , details, , source] = actionLogs.logAction.mock.calls[0];
    expect(entityType).toBe('Trip');
    expect(entityId).toBe('trip-1');
    expect(action).toBe('STATUS_CHANGED');
    expect(details).toMatchObject({
      scope: 'stop',
      stopId: 'stop-1',
      previousStatus: 'pending',
      newStatus: 'arrived',
      source: 'mobile',
    });
    expect(source).toBe('mobile');
  });

  it('completes the trip only after the delivery stop is completed', async () => {
    stop.status = 'completed';
    delivery.status = 'unloading';

    await service.updateStopStatus('stop-2', 'completed', driverUser);

    expect(repo.update).toHaveBeenCalledWith('trip-1', expect.objectContaining({ status: 'completed' }));
    expect(repo.manager.update).toHaveBeenCalledWith('Order', { id: 'order-1' }, expect.objectContaining({ status: 'delivered', operationalStatus: 'COMPLETED' }));
  });

  it('absorbs repeated taps without a second event', async () => {
    stop.status = 'arrived';
    await service.updateStopStatus('stop-1', 'arrived', driverUser);
    expect(actionLogs.logAction).not.toHaveBeenCalled();
    expect(repo.manager.save).not.toHaveBeenCalled();
  });

  it('rejects an impossible transition', async () => {
    await expect(service.updateStopStatus('stop-1', 'completed', driverUser)).rejects.toBeInstanceOf(ConflictException);
    expect(repo.manager.save).not.toHaveBeenCalled();
  });

  it('rejects a driver who does not own the trip', async () => {
    await expect(service.updateStopStatus('stop-1', 'arrived', otherDriver)).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.manager.save).not.toHaveBeenCalled();
  });
});
