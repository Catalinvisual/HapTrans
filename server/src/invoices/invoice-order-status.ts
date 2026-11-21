import { EntityManager } from 'typeorm';
import { InvoiceStatus } from './invoice.entity';
import { Order } from '../orders/order.entity';

/**
 * The order's commercial status follows the invoice raised for it, so the TMS
 * order list (and its Invoiced filter) can show a draft, an issued or a paid
 * invoice without loading the invoice itself.
 */
export const INVOICE_DRAFT_ORDER_STATUS = 'invoice_draft';

const INVOICE_TO_ORDER_STATUS: Record<string, string> = {
  [InvoiceStatus.DRAFT]: INVOICE_DRAFT_ORDER_STATUS,
  [InvoiceStatus.APPROVED]: 'invoiced',
  [InvoiceStatus.SENT]: 'invoiced',
  [InvoiceStatus.VIEWED]: 'invoiced',
  [InvoiceStatus.OVERDUE]: 'invoiced',
  [InvoiceStatus.PAID]: 'paid',
  [InvoiceStatus.CANCELLED]: 'ready_for_invoice',
};

/** Order status that a given invoice status maps to, or null for unknown ones. */
export function orderStatusForInvoiceStatus(status: string | null | undefined): string | null {
  const key = String(status ?? '').toLowerCase().trim();
  return INVOICE_TO_ORDER_STATUS[key] ?? null;
}

/**
 * Only these statuses describe a finished transport. Planning, in-transit and
 * cancelled orders keep their own status even when an invoice is linked.
 */
export const INVOICE_SYNCABLE_ORDER_STATUSES = [
  'delivered',
  'pod_received',
  'completed',
  'ready_for_invoice',
  INVOICE_DRAFT_ORDER_STATUS,
  'invoiced',
  'paid',
];

export function orderStatusFollowsInvoice(status: string | null | undefined): boolean {
  return INVOICE_SYNCABLE_ORDER_STATUSES.includes(String(status ?? '').toLowerCase().trim());
}

/**
 * Writes the invoice's financial state onto the linked order. The guarded
 * UPDATE never rewrites a planning, in-transit or cancelled order, so an early
 * invoice cannot pull an order out of dispatch.
 */
export async function syncOrderStatusForInvoice(
  manager: EntityManager,
  invoice: { orderId?: string | null; status?: string | null },
): Promise<void> {
  const orderId = invoice?.orderId;
  const next = orderStatusForInvoiceStatus(invoice?.status ?? null);
  if (!orderId || !next) return;
  try {
    await manager.createQueryBuilder()
      .update(Order)
      .set({ status: next } as any)
      .where('id = :id', { id: orderId })
      .andWhere('LOWER(status) IN (:...statuses)', { statuses: INVOICE_SYNCABLE_ORDER_STATUSES })
      .execute();
  } catch (e: any) {
    console.warn(`Could not sync order ${orderId} with invoice status ${invoice?.status}: ${e?.message}`);
  }
}
