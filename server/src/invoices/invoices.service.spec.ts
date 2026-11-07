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