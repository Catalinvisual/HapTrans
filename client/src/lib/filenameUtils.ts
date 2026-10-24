/**
 * Sanitizes a company or client name for safe use in filenames across Windows SMB, Linux NAS, and Cloudinary.
 * - Strips accents/diacritics (e.g. ă, î, ș, ț, é, ö -> a, i, s, t, e, o)
 * - Removes illegal filename characters: / \ : * ? " < > | & , . ' `
 * - Normalizes whitespace and hyphens to clean single underscores
 * - Limits length to 30 characters
 */
export function sanitizeClientNameForFilename(clientName?: string | null): string {
  if (!clientName || typeof clientName !== 'string') return '';
  return clientName
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .replace(/[\s\-]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30);
}

/**
 * Returns a standardized, clean invoice filename:
 * e.g. "INV-2026-00046_Trans_Logistics.pdf" or "Invoice_FACT-2024001_Mega_Trans.pdf"
 */
export function getCleanInvoiceFilename(invoiceNumber?: string | null, clientName?: string | null): string {
  const clean = (invoiceNumber || 'Document').trim();
  const base = clean.toUpperCase().startsWith('INV') ? clean : `Invoice_${clean}`;
  const safeClient = sanitizeClientNameForFilename(clientName);
  return safeClient ? `${base}_${safeClient}.pdf` : `${base}.pdf`;
}

/**
 * Returns a standardized, clean transport order filename:
 * e.g. "ORD-2026-000032_DHL_Express.pdf" or "Order_ORD-2026-000032_DHL.pdf"
 */
export function getCleanOrderFilename(orderNumber?: string | null, clientName?: string | null): string {
  const clean = (orderNumber || 'Order').trim();
  const base = clean.toUpperCase().startsWith('ORD') ? clean : `Order_${clean}`;
  const safeClient = sanitizeClientNameForFilename(clientName);
  return safeClient ? `${base}_${safeClient}.pdf` : `${base}.pdf`;
}
