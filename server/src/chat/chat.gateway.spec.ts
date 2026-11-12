import { ChatGateway } from './chat.gateway';

describe('ChatGateway operational broadcasts', () => {
  it('marks a driver-originated change so that phone never notifies itself', () => {
    const gateway = new ChatGateway({} as any, {} as any, {} as any, {} as any, {} as any);
    gateway.server = { emit: jest.fn() } as any;

    gateway.broadcastOperationalUpdate({
      tripId: 'trip-1',
      operationalStatus: 'LOADING',
      event: 'STOP_STATUS_CHANGED',
      source: 'mobile',
      driverUserId: 'driver-user-1',
    });

    expect(gateway.server.emit).toHaveBeenCalledWith('tripUpdated', expect.objectContaining({
      source: 'mobile',
      isDriver: true,
      driverUserId: 'driver-user-1',
    }));
  });

  it('keeps a TMS-originated change addressed to the assigned driver', () => {
    const gateway = new ChatGateway({} as any, {} as any, {} as any, {} as any, {} as any);
    gateway.server = { emit: jest.fn() } as any;

    gateway.broadcastOperationalUpdate({
      tripId: 'trip-1',
      operationalStatus: 'UNLOADING',
      event: 'STOP_STATUS_CHANGED',
      source: 'tms',
      driverUserId: 'driver-user-1',
    });

    expect(gateway.server.emit).toHaveBeenCalledWith('tripUpdated', expect.objectContaining({
      source: 'tms',
      isDriver: false,
      driverUserId: 'driver-user-1',
    }));
  });
});
