/**
 * Sanitizes a company or client name for safe, elegant use in filenames across Windows SMB, Linux NAS, and Cloudinary.
 * - Strips accents/diacritics (e.g. ă, î, ș, ț, é, ö -> a, i, s, t, e, o)
 * - Removes illegal filename characters: / \ : * ? " < > | & , . ' `
 * - Preserves natural single spaces between words
 * - Limits length to 35 characters
 */
export function sanitizeClientNameForFilename(clientName?: string | null): string {
  if (!clientName || typeof clientName !== 'string') return '';
  return clientName
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[\-_]{2,}/g, '-')
    .trim()
    .slice(0, 35);
}

/**
 * Returns a standardized, clean invoice filename with dash separator:
 * e.g. "INV-2026-00046 - Mega Trans.pdf" or "Invoice_FACT-2024001 - Mega Trans.pdf"
 */
export function getCleanInvoiceFilename(invoiceNumber?: string | null, clientName?: string | null): string {
  const clean = (invoiceNumber || 'Document').trim();
  const base = clean.toUpperCase().startsWith('INV') ? clean : (clean === 'Document' ? 'Document' : `Invoice - ${clean}`);
  const safeClient = sanitizeClientNameForFilename(clientName);
  return safeClient ? `${base} - ${safeClient}.pdf` : `${base}.pdf`;
}

/**
 * Returns a standardized, clean transport order filename with dash separator:
 * e.g. "ORD-2026-000032 - DHL Express.pdf" or "Order - 104 - DHL Express.pdf"
 */
export function getCleanOrderFilename(orderNumber?: string | null, clientName?: string | null): string {
  const clean = (orderNumber || 'Order').trim();
  const base = clean.toUpperCase().startsWith('ORD') ? clean : (clean === 'Order' ? 'Order' : `Order - ${clean}`);
  const safeClient = sanitizeClientNameForFilename(clientName);
  return safeClient ? `${base} - ${safeClient}.pdf` : `${base}.pdf`;
}

/**
 * Returns a standardized, clean profile or spec filename with dash separator:
 * e.g. "Client - Mega Trans.pdf", "Truck - B-123-XYZ.pdf", "Trailer - B-456-ABC.pdf"
 */
export function getCleanProfileFilename(type: 'Client' | 'Truck' | 'Trailer', identifier?: string | null): string {
  const cleanId = sanitizeClientNameForFilename(identifier || 'Profile');
  return cleanId ? `${type} - ${cleanId}.pdf` : `${type}.pdf`;
}
