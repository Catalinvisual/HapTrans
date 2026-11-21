import {
  INVOICE_DRAFT_ORDER_STATUS,
  INVOICE_SYNCABLE_ORDER_STATUSES,
  orderIsInvoiceable,
  orderOperationalCompleted,
  orderStatusFollowsInvoice,
  orderStatusForInvoiceStatus,
} from './invoice-order-status';

describe('order status derived from invoice status', () => {
  it('marks a draft invoice on the order as invoice_draft', () => {
    expect(orderStatusForInvoiceStatus('draft')).toBe(INVOICE_DRAFT_ORDER_STATUS);
  });

  it('marks approved, sent, viewed and overdue invoices as invoiced', () => {
    for (const status of ['approved', 'sent', 'viewed', 'overdue']) {
      expect(orderStatusForInvoiceStatus(status)).toBe('invoiced');
    }
  });

  it('marks a settled invoice as paid', () => {
    expect(orderStatusForInvoiceStatus('paid')).toBe('paid');
  });

  it('returns a delivered order to ready_for_invoice when its invoice is cancelled', () => {
    expect(orderStatusForInvoiceStatus('cancelled')).toBe('ready_for_invoice');
  });

  it('ignores unknown or missing invoice statuses', () => {
    expect(orderStatusForInvoiceStatus('weird')).toBeNull();
    expect(orderStatusForInvoiceStatus(null)).toBeNull();
    expect(orderStatusForInvoiceStatus(undefined)).toBeNull();
  });

  it('never rewrites planning, in-transit or cancelled orders', () => {
    for (const status of ['draft', 'new', 'planned', 'assigned', 'in_transit', 'cancelled']) {
      expect(orderStatusFollowsInvoice(status)).toBe(false);
    }
    for (const status of INVOICE_SYNCABLE_ORDER_STATUSES) {
      expect(orderStatusFollowsInvoice(status)).toBe(true);
    }
  });
});

describe('invoicing requires a finished transport', () => {
  it('invoices an order whose operational status is completed, even with an old stored status', () => {
    expect(orderIsInvoiceable({ status: 'planned', operationalStatus: 'COMPLETED' })).toBe(true);
    expect(orderOperationalCompleted({ operationalStatus: 'completed' })).toBe(true);
  });

  it('refuses an order still shown in planning, loading or transit', () => {
    for (const operationalStatus of ['PLANNING', 'LOADING', 'IN_TRANSIT', 'ASSIGNED']) {
      expect(orderIsInvoiceable({ status: 'delivered', operationalStatus })).toBe(false);
    }
  });

  it('keeps already invoiced orders editable', () => {
    for (const status of ['invoice_draft', 'invoiced', 'paid']) {
      expect(orderIsInvoiceable({ status, operationalStatus: 'PLANNING' })).toBe(true);
    }
  });

  it('falls back to the commercial status for rows without an operational status', () => {
    expect(orderIsInvoiceable({ status: 'delivered', operationalStatus: null })).toBe(true);
    expect(orderIsInvoiceable({ status: 'completed', operationalStatus: undefined })).toBe(true);
    expect(orderIsInvoiceable({ status: 'planning', operationalStatus: '' })).toBe(false);
  });
});
