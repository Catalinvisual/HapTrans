import { ChatGateway } from './chat.gateway';
import { WsException } from '@nestjs/websockets';

/**
 * Every global broadcast is now scoped to the room populated by authenticated
 * sockets, and a socket that never presented a valid token cannot act.
 */
function makeGateway() {
  const gateway = new ChatGateway(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    { verify: jest.fn() } as any,
  );
  const emit = jest.fn();
  const to = jest.fn(() => ({ emit }));
  gateway.server = { to, emit } as any;
  return { gateway, emit, to };
}

describe('ChatGateway operational broadcasts', () => {
  it('marks a driver-originated change so that phone never notifies itself', () => {
    const { gateway, emit, to } = makeGateway();

    gateway.broadcastOperationalUpdate({
      tripId: 'trip-1',
      operationalStatus: 'LOADING',
      event: 'STOP_STATUS_CHANGED',
      source: 'mobile',
      driverUserId: 'driver-user-1',
    });

    expect(to).toHaveBeenCalledWith('authenticated');
    expect(emit).toHaveBeenCalledWith('tripUpdated', expect.objectContaining({
      source: 'mobile',
      isDriver: true,
      driverUserId: 'driver-user-1',
    }));
  });

  it('keeps a TMS-originated change addressed to the assigned driver', () => {
    const { gateway, emit } = makeGateway();

    gateway.broadcastOperationalUpdate({
      tripId: 'trip-1',
      operationalStatus: 'UNLOADING',
      event: 'STOP_STATUS_CHANGED',
      source: 'tms',
      driverUserId: 'driver-user-1',
    });

    expect(emit).toHaveBeenCalledWith('tripUpdated', expect.objectContaining({
      source: 'tms',
      isDriver: false,
      driverUserId: 'driver-user-1',
    }));
  });

  it('never broadcasts a trip update to an unauthenticated audience', () => {
    const { gateway, emit } = makeGateway();
    gateway.broadcastTripUpdate('trip-1', 'started', 'driver-user-1', false);

    expect(emit).toHaveBeenCalledTimes(1);
    expect(gateway.server.to).toHaveBeenCalledWith('authenticated');
  });
});

describe('ChatGateway authentication', () => {
  it('refuses to send a message from a socket without a user', async () => {
    const { gateway } = makeGateway();
    const socket = { data: {}, rooms: new Set<string>(), id: 'socket-1' } as any;

    await expect(
      gateway.handleMessage(socket, { tripId: 'trip-1', content: 'hello' }),
    ).rejects.toBeInstanceOf(WsException);
  });

  it('derives the sender from the authenticated socket, not the payload', async () => {
    const { gateway } = makeGateway();
    const broadcast = jest.spyOn(gateway, 'broadcastMessage').mockResolvedValue({} as any);
    const socket = { data: { user: { id: 'real-user', role: 'dispatcher' } }, rooms: new Set(), id: 's' } as any;

    await gateway.handleMessage(socket, { tripId: 'trip-1', senderId: 'someone-else', content: 'hi' });

    expect(broadcast).toHaveBeenCalledWith(expect.objectContaining({ senderId: 'real-user' }));
  });

  it('refuses joinTrip for an anonymous socket', async () => {
    const { gateway } = makeGateway();
    const socket = { data: {}, rooms: new Set<string>(), id: 'socket-1' } as any;

    await expect(
      gateway.handleJoinTrip(socket, { tripId: 'trip-1' }),
    ).rejects.toBeInstanceOf(WsException);
  });
});
