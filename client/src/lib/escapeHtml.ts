/**
 * Escapes a value for interpolation into an HTML string.
 *
 * Map popups are built as markup and handed to `Popup.setHTML()`. The values
 * they show (addresses, company names, telematics activity, driver names) can
 * originate from a portal client, an Excel import or a provider feed, so they
 * must be escaped here rather than trusted to a third-party sanitizer.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
