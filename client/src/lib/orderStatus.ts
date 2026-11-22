import { operationalStatusForDisplay, operationalStatusKey } from './operationalI18n';

const BILLING_BADGE_STATUSES = ['invoice_draft', 'invoiced', 'paid'];
const INVOICED_STATUSES = ['ready_for_invoice', 'invoice_draft', 'invoiced', 'paid'];

/**
 * The invoice is the source of truth for the financial side of an order. The
 * server sends `billingStatus` from the linked invoice, so the billing stage is
 * correct even when the stored order status is stale.
 */
export function billingStatusOf(order: any): string {
  const fromInvoice = String(order?.billingStatus || '');
  if (BILLING_BADGE_STATUSES.includes(fromInvoice)) return fromInvoice;
  const stored = String(order?.status || '');
  return BILLING_BADGE_STATUSES.includes(stored) ? stored : '';
}

export function effectiveOrderStatus(order: any): string {
  return billingStatusOf(order) || String(order?.status || '');
}

export function isInvoicedOrderStatus(status: string): boolean {
  return INVOICED_STATUSES.includes(String(status || ''));
}

/**
 * Mirrors the orders list badge exactly: invoiced beats completed, so a
 * finished order with an invoice reads "Invoiced" in the drawer as well.
 */
export function orderStatusDisplay(order: any): { code: string; labelKey: string; fallback: string } {
  const billing = billingStatusOf(order);
  if (billing) {
    return { code: billing, labelKey: `status_${billing}`, fallback: billing.replace(/_/g, ' ') };
  }
  const operational = operationalStatusForDisplay(order);
  return { code: operational, labelKey: operationalStatusKey(order), fallback: operational };
}
