import { InvoicesService } from './invoices.service';

describe('InvoicesService automatic draft invoice', () => {
  let repo: any;
  let service: InvoicesService;
  let orderRepo: any;

  beforeEach(() => {
    orderRepo = { findOne: jest.fn() };
    repo = {
      findOne: jest.fn(),
      update: jest.fn(async () => ({})),
      manager: { getRepository: jest.fn(() => orderRepo) },
    };
    service = new InvoicesService(repo as any, { logAction: jest.fn(async () => ({})) } as any);
  });

  it('returns the existing invoice without creating a duplicate', async () => {
    repo.findOne.mockResolvedValue({ id: 'inv-existing', orderId: 'ord-1' });
    const create = jest.spyOn(service as any, 'create');

    const result = await service.createDraftForCompletedOrder('ord-1');

    expect(result.created).toBe(false);
    expect(result.reason).toBe('already_invoiced');
    expect(create).not.toHaveBeenCalled();
  });

  it('creates one draft linked to the completed order', async () => {
    repo.findOne.mockResolvedValueOnce(null);
    orderRepo.findOne.mockResolvedValue({
      id: 'ord-1',
      orderNumber: 'ORD-1',
      status: 'delivered',
      price: 1200,
      client: { id: 'client-1' },
      trip: { id: 'trip-1', tripNumber: 'TRP-1' },
    });
    const create = jest.spyOn(service, 'create').mockResolvedValue({ id: 'inv-1' } as any);

    const result = await service.createDraftForCompletedOrder('ord-1', { id: 'u1' });

    expect(result.created).toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      orderId: 'ord-1', tripId: 'trip-1', clientId: 'client-1', status: 'draft', amount: 1200,
    }), { id: 'u1' });
  });

  it('stores the full transport snapshot on the automatic draft', async () => {
    repo.findOne.mockResolvedValueOnce(null);
    orderRepo.findOne.mockResolvedValue({
      id: 'ord-1',
      orderNumber: 'ORD-1',
      status: 'delivered',
      price: 1200,
      client: { id: 'client-1' },
      loadingReference: 'LOAD-1',
      unloadingReference: 'UNLOAD-1',
      stops: [
        { type: 'pickup', sequence: 1, address: 'Warehouse A, Bucharest', dateFrom: '2026-11-01', timeFrom: '08:00' },
        { type: 'delivery', sequence: 2, address: 'Warehouse B, Rotterdam', dateFrom: '2026-11-03', timeFrom: '10:30' },
      ],
      cargoItems: [{ unit: 'pallet', quantity: 33, weightKg: 24000, volumeCbm: 40, description: 'General cargo' }],
      trip: {
        id: 'trip-1',
        tripNumber: 'TRP-1',
        stops: [],
        truck: { plateNumber: 'B-123-XY' },
        trailer: { plateNumber: 'TR-456' },
        driver: { user: { name: 'Ion Popescu' } },
      },
    });
    const create = jest.spyOn(service, 'create').mockResolvedValue({ id: 'inv-1' } as any);

    await service.createDraftForCompletedOrder('ord-1');

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      transportDetails: expect.objectContaining({
        loadingAddress: 'Warehouse A, Bucharest',
        unloadingAddress: 'Warehouse B, Rotterdam',
        loadingDate: '2026-11-01',
        loadingTime: '08:00',
        unloadingDate: '2026-11-03',
        unloadingTime: '10:30',
        loadingReference: 'LOAD-1',
        unloadingReference: 'UNLOAD-1',
        pallets: 33,
        weightKg: 24000,
        volumeCbm: 40,
        cargoDescription: 'General cargo',
        vehicle: 'B-123-XY / TR-456',
        driver: 'Ion Popescu',
      }),
    }), undefined);
  });

  it('creates a separate draft for each client/order on the same trip', async () => {
    repo.findOne.mockResolvedValue(null);
    const trip = { id: 'trip-1', tripNumber: 'TRP-1', orders: [{ id: 'ord-a' }, { id: 'ord-b' }] };
    orderRepo.findOne
      .mockResolvedValueOnce({
        id: 'ord-a', orderNumber: 'ORD-A', status: 'delivered', price: 500,
        client: { id: 'client-a' }, trip,
        stops: [{ type: 'pickup', sequence: 1, address: 'A pickup' }, { type: 'delivery', sequence: 2, address: 'A delivery' }],
        cargoItems: [{ unit: 'pallet', quantity: 5, weightKg: 1000 }],
      })
      .mockResolvedValueOnce({
        id: 'ord-b', orderNumber: 'ORD-B', status: 'delivered', price: 700,
        client: { id: 'client-b' }, trip,
        stops: [{ type: 'pickup', sequence: 1, address: 'B pickup' }, { type: 'delivery', sequence: 2, address: 'B delivery' }],
        cargoItems: [{ unit: 'pallet', quantity: 8, weightKg: 2000 }],
      });
    const create = jest.spyOn(service, 'create')
      .mockResolvedValueOnce({ id: 'inv-a' } as any)
      .mockResolvedValueOnce({ id: 'inv-b' } as any);

    await service.createDraftForCompletedOrder('ord-a');
    await service.createDraftForCompletedOrder('ord-b');

    expect(create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      orderId: 'ord-a', clientId: 'client-a', tripId: 'trip-1',
      transportDetails: expect.objectContaining({ loadingAddress: 'A pickup', unloadingAddress: 'A delivery', pallets: 5 }),
    }), undefined);
    expect(create).toHaveBeenNthCalledWith(2, expect.objectContaining({
      orderId: 'ord-b', clientId: 'client-b', tripId: 'trip-1',
      transportDetails: expect.objectContaining({ loadingAddress: 'B pickup', unloadingAddress: 'B delivery', pallets: 8 }),
    }), undefined);
  });

  it('does not mix another client stop when the order has no stop rows', () => {
    const trip = {
      id: 'trip-1',
      orders: [{ id: 'ord-a' }, { id: 'ord-b' }],
      stops: [
        { type: 'pickup', sequence: 1, address: 'A pickup', tasks: [{ order: { id: 'ord-a' } }] },
        { type: 'pickup', sequence: 2, address: 'B pickup', tasks: [{ order: { id: 'ord-b' } }] },
        { type: 'delivery', sequence: 3, address: 'A delivery', tasks: [{ order: { id: 'ord-a' } }] },
        { type: 'delivery', sequence: 4, address: 'B delivery', tasks: [{ order: { id: 'ord-b' } }] },
      ],
    };

    const details = (service as any).buildTransportDetailsFrom({ id: 'ord-a', client: { id: 'client-a' } }, trip);

    expect(details.loadingAddress).toBe('A pickup');
    expect(details.unloadingAddress).toBe('A delivery');
    expect(details.loadingAddress).not.toContain('B pickup');
  });

  it('does not invoice an order that is not operationally completed', async () => {
    repo.findOne.mockResolvedValue(null);
    orderRepo.findOne.mockResolvedValue({
      id: 'ord-1', status: 'in_transit', client: { id: 'client-1' }, trip: null,
    });
    const create = jest.spyOn(service, 'create');

    const result = await service.createDraftForCompletedOrder('ord-1');

    expect(result.created).toBe(false);
    expect(result.reason).toBe('order_not_completed');
    expect(create).not.toHaveBeenCalled();
  });

  it('repairs a legacy draft from its trip and client when orderId is missing', async () => {
    const invoice = {
      id: 'inv-legacy',
      orderId: null,
      trip: { id: 'trip-1' },
      client: { id: 'client-1' },
      transportDetails: null,
    };
    jest.spyOn(service, 'findOne').mockResolvedValue(invoice as any);
    const resolve = jest.spyOn(service as any, 'resolveTransportDetails')
      .mockResolvedValue({ loadingAddress: 'Warehouse A' });

    const result = await service.findOneForPdf('inv-legacy');

    expect(resolve).toHaveBeenCalledWith({ orderId: null, tripId: 'trip-1', clientId: 'client-1' });
    expect(result?.transportDetails).toEqual({ loadingAddress: 'Warehouse A' });
    expect(repo.update).toHaveBeenCalledWith('inv-legacy', {
      transportDetails: { loadingAddress: 'Warehouse A' },
    });
  });

  it('returns the concurrently-created invoice when the unique order key wins the race', async () => {
    repo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'inv-raced', orderId: 'ord-1' });
    orderRepo.findOne.mockResolvedValue({
      id: 'ord-1', orderNumber: 'ORD-1', status: 'delivered', price: 10,
      client: { id: 'client-1' }, trip: null,
    });
    jest.spyOn(service, 'create').mockRejectedValue(new Error('duplicate key value'));

    const result = await service.createDraftForCompletedOrder('ord-1');

    expect(result.created).toBe(false);
    expect(result.reason).toBe('concurrent_completion');
    expect(result.invoice?.id).toBe('inv-raced');
  });
});