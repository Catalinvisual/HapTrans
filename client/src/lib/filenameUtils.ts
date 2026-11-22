/**
 * Sanitizes a company or client name for safe, elegant use in filenames across Windows SMB, Linux NAS, and Cloudinary.
 * - Strips accents/diacritics (e.g. ă, î, ș, ț, é, ö -> a, i, s, t, e, o)
 * - Removes illegal filename characters: / \ : * ? " < > | & , . ' `
 * - Preserves natural single spaces between words
 * - Limits length to 35 characters
 */
/**
 * Document names read as a sentence: spaces between the words and never an
 * underscore (the NAS, the browser download and Excel all receive the same
 * name). Hyphens inside references stay untouched, so "ORD-2026-000035" and
 * "AR-67-XWT" are never broken into "ORD - 2026 - 000035".
 */
export function normalizeDocumentName(value?: string | null): string {
  return String(value ?? '')
    .replace(/_+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeClientNameForFilename(clientName?: string | null): string {
  if (!clientName || typeof clientName !== 'string') return '';
  return normalizeDocumentName(clientName
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\-\s]/g, ''))
    .replace(/[\-]{2,}/g, '-')
    .trim()
    .slice(0, 35);
}

/**
 * Returns a standardized, clean invoice filename with dash separator:
 * e.g. "INV-2026-00046 - Mega Trans.pdf" or "Invoice_FACT-2024001 - Mega Trans.pdf"
 */
export function getCleanInvoiceFilename(invoiceNumber?: string | null, clientName?: string | null): string {
  const clean = normalizeDocumentName(invoiceNumber || 'Document');
  const base = clean.toUpperCase().startsWith('INV') ? clean : (clean === 'Document' ? 'Document' : `Invoice - ${clean}`);
  const safeClient = sanitizeClientNameForFilename(clientName);
  return safeClient ? `${base} - ${safeClient}.pdf` : `${base}.pdf`;
}

/**
 * Returns a standardized, clean transport order filename with dash separator:
 * e.g. "ORD-2026-000032 - DHL Express.pdf" or "Order - 104 - DHL Express.pdf"
 */
export function getCleanOrderFilename(orderNumber?: string | null, clientName?: string | null): string {
  const clean = normalizeDocumentName(orderNumber || 'Order');
  const base = clean.toUpperCase().startsWith('ORD') ? clean : (clean === 'Order' ? 'Order' : `Order - ${clean}`);
  const safeClient = sanitizeClientNameForFilename(clientName);
  return safeClient ? `${base} - ${safeClient}.pdf` : `${base}.pdf`;
}

/**
 * Returns a standardized, clean profile or spec filename with dash separator:
 * e.g. "Client - Mega Trans.pdf", "Truck - B-123-XYZ.pdf", "Trailer - B-456-ABC.pdf", "Driver - Ion Popescu.pdf"
 */
export function getCleanProfileFilename(type: 'Client' | 'Truck' | 'Trailer' | 'Driver', identifier?: string | null): string {
  const cleanId = sanitizeClientNameForFilename(identifier || 'Profile');
  return cleanId ? `${type} - ${cleanId}.pdf` : `${type}.pdf`;
}

/**
 * Returns a standardized, clean trip sheet filename with dash separator:
 * e.g. "TRP-2026-000012 - CJ33ZTF.pdf" or "Trip - 104 - Ion Popescu.pdf"
 */
export function getCleanTripFilename(tripNumber?: string | null, identifier?: string | null): string {
  const clean = normalizeDocumentName(tripNumber || 'Trip');
  const base = clean.toUpperCase().startsWith('TRP') ? clean : (clean === 'Trip' ? 'Trip' : `Trip - ${clean}`);
  const safeId = sanitizeClientNameForFilename(identifier);
  return safeId ? `${base} - ${safeId}.pdf` : `${base}.pdf`;
}
