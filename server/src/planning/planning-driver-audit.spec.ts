jest.mock('or-tools-wasm/routing', () => ({}));
jest.mock('or-tools-wasm', () => ({}));
import { PlanningService } from './planning.service';

describe('PlanningService driver status audit', () => {
  let service: any;
  let actionLogs: any;
  let notifications: any;

  beforeEach(() => {
    actionLogs = { logAction: jest.fn(async () => ({})) };
    notifications = { createOnce: jest.fn(async () => ({ created: true, notification: {} })) };
    service = Object.create(PlanningService.prototype);
    service.actionLogs = actionLogs;
    service.notificationsService = notifications;
    service.logger = { warn: jest.fn() };
  });

  it('records a driver acceptance in the TMS audit feed', async () => {
    const user = { id: 'u1', role: 'driver', name: 'Ion Popescu' };
    const trip = {
      id: 'trip-1',
      tripNumber: 'TRP-1',
      operationalStatus: 'ACCEPTED',
      driver: { user: { name: 'Ion Popescu' } },
    };

    await service.auditDriverTripStatus(trip, user, 'dispatched', 'driver_accepted');

    expect(actionLogs.logAction).toHaveBeenCalledWith(
      'Trip',
      'trip-1',
      'STATUS_CHANGED',
      user,
      expect.objectContaining({
        previousStatus: 'dispatched',
        newStatus: 'driver_accepted',
        source: 'mobile',
        scope: 'trip',
      }),
      undefined,
      'mobile',
    );
    expect(notifications.createOnce).toHaveBeenCalledWith(expect.objectContaining({
      type: 'trip',
      origin: 'DRIVER_APP',
      audience: 'tms',
      relatedId: 'trip-1',
    }));
  });

  it('never fails the acceptance because audit or notification failed', async () => {
    actionLogs.logAction.mockRejectedValue(new Error('audit unavailable'));
    notifications.createOnce.mockRejectedValue(new Error('notification unavailable'));

    await expect(service.auditDriverTripStatus(
      { id: 'trip-2', tripNumber: 'TRP-2' },
      { id: 'u1', role: 'driver' },
      'dispatched',
      'driver_accepted',
    )).resolves.toBeUndefined();
  });
});
