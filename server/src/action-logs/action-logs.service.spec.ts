import { ActionLogsService } from './action-logs.service';

describe('ActionLogsService entity history', () => {
  let repo: any;
  let service: ActionLogsService;
  let rows: any[];
  let trip: any;

  beforeEach(() => {
    rows = [
      {
        id: 'order-log',
        entityType: 'Order',
        entityId: 'order-1',
        action: 'CREATED',
        details: {},
        source: 'tms',
        createdAt: new Date('2026-11-01T08:00:00Z'),
      },
      {
        id: 'trip-log',
        entityType: 'Trip',
        entityId: 'trip-1',
        action: 'STATUS_CHANGED',
        details: { previousStatus: 'driver_accepted', newStatus: 'loading', source: 'mobile' },
        source: 'mobile',
        createdAt: new Date('2026-11-02T08:00:00Z'),
      },
    ];
    trip = {
      id: 'trip-1',
      companyId: 'company-1',
      driverAcknowledgedAt: new Date('2026-11-01T09:00:00Z'),
      driverAcceptedAt: new Date('2026-11-01T10:00:00Z'),
      driver: { user: { id: 'driver-user-1', name: 'Ion Popescu', email: 'ion@example.com' } },
    };

    repo = {
      createQueryBuilder: jest.fn(() => {
        let entityType: string;
        let entityId: string;
        const qb: any = {
          leftJoinAndSelect: jest.fn(() => qb),
          where: jest.fn((_sql: string, params: any) => {
            entityType = params.entityType;
            return qb;
          }),
          andWhere: jest.fn((_sql: string, params?: any) => {
            if (params?.entityId) entityId = params.entityId;
            return qb;
          }),
          orderBy: jest.fn(() => qb),
          getMany: jest.fn(async () => rows.filter(
            (row) => row.entityType === entityType && row.entityId === entityId,
          )),
        };
        return qb;
      }),
      manager: {
        getRepository: jest.fn((entity: string) => {
          if (entity === 'Order') {
            return { findOne: jest.fn(async () => ({ id: 'order-1', trip: { id: 'trip-1' } })) };
          }
          if (entity === 'StopTask') return { find: jest.fn(async () => []) };
          return { findOne: jest.fn(async () => trip) };
        }),
      },
    };
    service = new ActionLogsService(repo as any);
  });

  it('includes trip events in an order timeline', async () => {
    const logs = await service.getLogsForEntity('Order', 'order-1', 'company-1');

    expect(logs.map((log: any) => log.id)).toEqual(
      expect.arrayContaining(['order-log', 'trip-log', 'derived-trip-1-driver_received', 'derived-trip-1-driver_accepted']),
    );
  });

  it('does not duplicate a driver acceptance that already has a real log', async () => {
    rows.push({
      id: 'accepted-log',
      entityType: 'Trip',
      entityId: 'trip-1',
      action: 'STATUS_CHANGED',
      details: { previousStatus: 'dispatched', newStatus: 'driver_accepted', source: 'mobile' },
      source: 'mobile',
      createdAt: new Date('2026-11-01T10:00:00Z'),
    });

    const logs = await service.getLogsForEntity('Trip', 'trip-1', 'company-1');

    expect(logs.some((log: any) => log.id === 'derived-trip-1-driver_accepted')).toBe(false);
    expect(logs.some((log: any) => log.id === 'accepted-log')).toBe(true);
  });
});
