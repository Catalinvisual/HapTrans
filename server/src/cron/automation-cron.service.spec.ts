import { AutomationCronService } from './automation-cron.service';

describe('AutomationCronService automatic invoices', () => {
  let orderRepo: any;
  let tripRepo: any;
  let invoicesService: any;
  let notificationsService: any;
  let service: AutomationCronService;

  beforeEach(() => {
    orderRepo = {
      find: jest.fn(),
      update: jest.fn(async () => ({})),
    };
    tripRepo = {};
    invoicesService = { createDraftForCompletedOrder: jest.fn() };
    notificationsService = { create: jest.fn(async () => ({})) };
    service = new AutomationCronService(
      orderRepo as any,
      tripRepo as any,
      invoicesService as any,
      notificationsService as any,
    );
  });

  it('uses the order-scoped draft builder and links the invoice to the order', async () => {
    orderRepo.find.mockResolvedValue([
      { id: 'ord-1', orderNumber: 'ORD-1', price: 1200, client: { id: 'client-1' }, invoice: null },
    ]);
    invoicesService.createDraftForCompletedOrder.mockResolvedValue({
      created: true,
      invoice: { id: 'inv-1', invoiceNumber: 'INV-2026-00001' },
    });

    await (service as any).autoInvoiceReadyOrders();

    expect(invoicesService.createDraftForCompletedOrder).toHaveBeenCalledWith('ord-1');
    expect(orderRepo.update).toHaveBeenCalledWith('ord-1', {
      status: 'invoiced',
      invoice: { id: 'inv-1' },
    });
    expect(notificationsService.create).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Factură generată automat',
      relatedId: 'inv-1',
    }));
  });

  it('skips orders that already have an invoice', async () => {
    orderRepo.find.mockResolvedValue([
      { id: 'ord-1', price: 1200, client: { id: 'client-1' }, invoice: { id: 'inv-1' } },
    ]);

    await (service as any).autoInvoiceReadyOrders();

    expect(invoicesService.createDraftForCompletedOrder).not.toHaveBeenCalled();
    expect(orderRepo.update).not.toHaveBeenCalled();
  });
});
