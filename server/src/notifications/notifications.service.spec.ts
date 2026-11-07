import { NotificationsService } from './notifications.service';

describe('NotificationsService event dedupe', () => {
  function setup() {
    const repo: any = {
      rows: [] as any[],
      findOne: jest.fn(async ({ where }: any) => {
        if (where.eventId) return repo.rows.find((row: any) => row.eventId === where.eventId) ?? null;
        return repo.rows.find((row: any) => row.relatedId === where.relatedId && row.type === where.type) ?? null;
      }),
      create: jest.fn((data: any) => ({ ...data })),
      save: jest.fn(async (row: any) => {
        row.id = row.id || `n-${repo.rows.length + 1}`;
        repo.rows.push(row);
        return row;
      }),
      find: jest.fn(async () => repo.rows.filter((row: any) => row.audience === 'tms')),
      count: jest.fn(async () => 0),
      update: jest.fn(async () => undefined),
    };
    const gateway: any = { emitNewNotification: jest.fn() };
    return { repo, gateway, service: new NotificationsService(repo, gateway) };
  }

  it('creates a driver-action event once and suppresses the retry', async () => {
    const { repo, gateway, service } = setup();
    const first = await service.createOnce({
      type: 'trip',
      title: 'Arrived at pickup',
      relatedId: 'trip-1',
      eventId: 'event-1',
      origin: 'DRIVER_APP',
      audience: 'tms',
    });
    const retry = await service.createOnce({
      type: 'trip',
      title: 'Arrived at pickup',
      relatedId: 'trip-1',
      eventId: 'event-1',
      origin: 'DRIVER_APP',
      audience: 'tms',
    });

    expect(first.created).toBe(true);
    expect(retry.created).toBe(false);
    expect(repo.rows).toHaveLength(1);
    expect(gateway.emitNewNotification).toHaveBeenCalledTimes(1);
  });

  it('keeps driver delivery-ledger rows out of the dispatcher feed', async () => {
    const { service } = setup();
    await service.createOnce({
      type: 'trip',
      title: 'Trip updated',
      relatedId: 'trip-1',
      eventId: 'event-driver',
      audience: 'driver',
      origin: 'TMS_DISPATCH',
    });
    expect(await service.findAll()).toHaveLength(0);
  });
});
