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

describe('InvoicesService invoice creation', () => {
  let repo: any;
  let service: InvoicesService;
  const year = new Date().getFullYear();

  beforeEach(() => {
    repo = {
      findOne: jest.fn(),
      find: jest.fn(async () => []),
      create: jest.fn((value: any) => value),
      merge: jest.fn((target: any, source: any) => Object.assign(target, source)),
      save: jest.fn(async (value: any) => ({ ...value })),
      update: jest.fn(async () => ({})),
      count: jest.fn(async () => 0),
      manager: { getRepository: jest.fn() },
    };
    service = new InvoicesService(repo as any, { logAction: jest.fn(async () => ({})) } as any);
    jest.spyOn(service, 'findOne').mockImplementation(async (id: string) => ({ id } as any));
    jest.spyOn(service as any, 'resolveTransportDetails').mockResolvedValue(null);
  });

  it('refreshes the draft raised at delivery with what the user submitted', async () => {
    repo.findOne.mockResolvedValue({
      id: 'inv-draft', orderId: 'ord-1', status: 'draft',
      invoiceNumber: `INV-${year}-00007`, issueDate: '2026-01-05',
    });

    await service.create({
      orderId: 'ord-1', clientId: 'client-1', amount: 1500, vatPercent: 19,
      issueDate: '2026-11-14', dueDate: '2026-12-14', status: 'approved',
    });

    expect(repo.save).toHaveBeenCalledTimes(1);
    const saved = repo.save.mock.calls[0][0];
    expect(saved.id).toBe('inv-draft');
    expect(saved.invoiceNumber).toBe(`INV-${year}-00007`);
    expect(saved.issueDate).toBe('2026-11-14');
    expect(saved.status).toBe('approved');
    expect(saved.total).toBeGreaterThan(0);
  });

  it('never rewrites an invoice that is already issued for the order', async () => {
    repo.findOne.mockResolvedValue({
      id: 'inv-issued', orderId: 'ord-1', status: 'sent', invoiceNumber: `INV-${year}-00008`,
    });

    const result = await service.create({ orderId: 'ord-1', clientId: 'client-1', amount: 100 });

    expect(result).toEqual({ id: 'inv-issued' });
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('returns the invoice already raised for the order instead of a duplicate key error', async () => {
    repo.findOne.mockResolvedValue({ id: 'inv-existing', orderId: 'ord-1', invoiceNumber: `INV-${year}-00007` });

    const result = await service.create({ orderId: 'ord-1', clientId: 'client-1', amount: 100 });

    expect(result).toEqual({ id: 'inv-existing' });
    expect(repo.save).not.toHaveBeenCalled();
  });


  it('numbers the next invoice after the highest number already used', async () => {
    repo.findOne.mockResolvedValue(null);
    repo.find.mockResolvedValue([
      { invoiceNumber: `INV-${year}-00002` },
      { invoiceNumber: `INV-${year}-00009` },
      { invoiceNumber: 'DRAFT' },
    ]);

    await service.create({ clientId: 'client-1', amount: 100, vatPercent: 19 });

    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ invoiceNumber: `INV-${year}-00010` }));
  });

  it('never stores the DRAFT placeholder as an invoice number', async () => {
    repo.findOne.mockResolvedValue(null);
    repo.find.mockResolvedValue([{ invoiceNumber: `INV-${year}-00004` }]);

    await service.create({ clientId: 'client-1', amount: 10, invoiceNumber: 'DRAFT' });

    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ invoiceNumber: `INV-${year}-00005` }));
  });

  it('retries with the next number when the unique index rejects the number', async () => {
    repo.findOne.mockResolvedValue(null);
    repo.find.mockResolvedValue([{ invoiceNumber: `INV-${year}-00010` }]);
    repo.save
      .mockRejectedValueOnce(Object.assign(new Error('duplicate key'), {
        driverError: { code: '23505', detail: `Key (invoice_number)=(INV-${year}-00011) already exists.` },
      }))
      .mockResolvedValueOnce({ id: 'inv-new' });

    await service.create({ clientId: 'client-1', amount: 10 });

    expect(repo.save).toHaveBeenCalledTimes(2);
    expect(repo.save.mock.calls[1][0].invoiceNumber).toBe(`INV-${year}-00012`);
  });

  it('explains a database rejection instead of returning a bare 500', async () => {
    repo.findOne.mockResolvedValue(null);
    repo.save.mockRejectedValueOnce(Object.assign(new Error('null value'), {
      driverError: { code: '23502', detail: 'null value in column "total" violates not-null constraint' },
    }));

    await expect(service.create({ clientId: 'client-1', amount: 10 })).rejects.toThrow(/total/);
  });
});
