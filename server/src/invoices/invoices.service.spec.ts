import { InvoicesService } from './invoices.service';

describe('InvoicesService automatic draft invoice', () => {
  let repo: any;
  let service: InvoicesService;
  let orderRepo: any;

  beforeEach(() => {
    orderRepo = { findOne: jest.fn() };
    repo = {
      findOne: jest.fn(),
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