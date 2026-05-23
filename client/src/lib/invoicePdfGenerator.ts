import { jsPDF } from 'jspdf';
import { getCompanySettings } from '../pages/SettingsPage';

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function generateInvoicePdfBase64(invoice: any) {
  const doc = new jsPDF();
  const trip = invoice.trip || {};
  const co = getCompanySettings();

  // Determine company display values (fall back to defaults if empty)
  const coName    = co.name    || 'HapTrans Transport S.R.L.';
  const coCui     = co.cui     || 'RO12345678';
  const coRegNo   = co.regNo   || 'J40/1234/2024';
  const coAddress = [co.address, co.postalCode, co.city, co.country].filter(Boolean).join(', ') || 'Bucuresti, Romania';
  const coPhone   = co.phone   || '+40 7xx xxx xxx';
  const coEmail   = co.email   || 'office@haptrans.ro';
  const coBank    = co.bank    ? `Banca: ${co.bank}` : '';
  const coIban    = co.iban    ? `IBAN: ${co.iban}` : '';

  // ─── 1. LOGO / BRAND ────────────────────────────────────────────────
  let headerY = 18;

  if (co.logo) {
    try {
      // Detect image type from data URL
      const ext = co.logo.startsWith('data:image/png') ? 'PNG'
        : co.logo.startsWith('data:image/svg') ? 'SVG'
        : 'JPEG';
      doc.addImage(co.logo, ext, 14, 10, 40, 14);
      headerY = 30;
    } catch {
      // Fall back to text brand if logo fails
      doc.setFontSize(22);
      doc.setTextColor(249, 115, 22);
      doc.setFont('helvetica', 'bold');
      doc.text(coName, 14, 18);
    }
  } else {
    doc.setFontSize(22);
    doc.setTextColor(249, 115, 22);
    doc.setFont('helvetica', 'bold');
    doc.text(coName, 14, 18);
  }

  // Title
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  // Added extra distance between logo/brand and INVOICE title
  doc.text('INVOICE', 14, headerY + 12);

  // ─── 2. INVOICE META (right) ─────────────────────────────────────────
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, 145, 18);
  doc.text(`Issue Date: ${fmtDate(invoice.issueDate)}`, 145, 24);
  doc.text(`Due Date:   ${fmtDate(invoice.dueDate)}`, 145, 30);

  // Decorative separator
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 38, 196, 38);

  // ─── 3. FROM / TO ────────────────────────────────────────────────────
  const addrY = 46;

  // FROM (left)
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('FROM:', 14, addrY);

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(coName, 14, addrY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const fromLines = [
    `CUI / Tax ID: ${coCui}`,
    coRegNo ? `Reg No: ${coRegNo}` : null,
    coAddress,
    coPhone ? `Tel: ${coPhone}` : null,
    coEmail ? `Email: ${coEmail}` : null,
    coBank || null,
    coIban || null,
  ].filter(Boolean) as string[];
  doc.text(fromLines, 14, addrY + 10);

  // TO (right)
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('TO / CLIENT:', 110, addrY);

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.client?.name || 'Client', 110, addrY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const clientAddr = [
    invoice.client?.address,
    invoice.client?.postalCode,
    invoice.client?.country,
  ].filter(Boolean).join(', ') || '—';
  doc.text([
    `VAT / Tax ID: ${invoice.client?.cui || '—'}`,
    `Address: ${clientAddr}`,
    `Email: ${invoice.client?.contactEmail || '—'}`,
    `Phone: ${invoice.client?.phone || '—'}`,
  ], 110, addrY + 10);

  // ─── 4. SERVICES TABLE ───────────────────────────────────────────────
  const tableY = 92;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, tableY, 182, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Description of Services', 16, tableY + 5.5);
  doc.text('VAT', 115, tableY + 5.5);
  doc.text('Qty', 142, tableY + 5.5);
  doc.text('Amount (EUR)', 163, tableY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Road freight transport services', 16, tableY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`${invoice.vatPercent}%`, 115, tableY + 14);
  doc.text('1', 142, tableY + 14);
  doc.text(`EUR ${Number(invoice.amount).toFixed(2)}`, 163, tableY + 14);

  // ─── 5. TRIP DETAILS (formatted dates DD/MM/YYYY) ────────────────────
  const detailY = tableY + 20;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);

  const pickupDateFmt  = fmtDate(trip.pickupDate);
  const dropoffDateFmt = fmtDate(trip.dropoffDate);

  // jsPDF standard fonts do not support Unicode arrows (→), replaced with standard dash (-)
  const routeText   = `Route: ${trip.pickupAddress || '—'} - ${trip.dropoffAddress || '—'}`;
  const datesText   = `Loading/Unloading: ${pickupDateFmt}${trip.pickupTime ? ' at ' + trip.pickupTime : ''} - ${dropoffDateFmt}${trip.dropoffTime ? ' at ' + trip.dropoffTime : ''}`;
  
  // Include palletType if available
  const palletTypeStr = trip.palletType ? ` (${trip.palletType})` : '';
  const cargoText   = `Cargo: ${trip.pallets || '0'} Pallets${palletTypeStr}  |  ${trip.weightKg || '0'} kg  |  ${trip.volumeCbm || '0'} m³`;
  const vehicleText = `Vehicle: ${trip.truck?.plateNumber || '—'}  |  Driver: ${trip.driver?.user?.name || '—'}`;
  const refsText    = `Refs: Loading ${trip.loadingReference || '—'}  |  Unloading ${trip.unloadingReference || '—'}`;

  doc.text(`• ${routeText}`,   18, detailY);
  doc.text(`• ${datesText}`,   18, detailY + 5);
  doc.text(`• ${cargoText}`,   18, detailY + 10);
  doc.text(`• ${vehicleText}`, 18, detailY + 15);
  doc.text(`• ${refsText}`,    18, detailY + 20);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(14, detailY + 25, 196, detailY + 25);

  // ─── 6. TOTALS ───────────────────────────────────────────────────────
  const subtotal  = Number(invoice.amount);
  const vatAmount = (subtotal * Number(invoice.vatPercent)) / 100;
  const total     = subtotal + vatAmount;

  const calcY = detailY + 32;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal:', 120, calcY);
  doc.text(`EUR ${subtotal.toFixed(2)}`, 165, calcY);

  doc.text(`VAT (${invoice.vatPercent}%):`, 120, calcY + 6);
  doc.text(`EUR ${vatAmount.toFixed(2)}`, 165, calcY + 6);

  doc.setLineWidth(1.0);
  doc.setDrawColor(15, 23, 42);
  doc.line(120, calcY + 10, 196, calcY + 10);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.text('TOTAL:', 120, calcY + 16);
  doc.text(`EUR ${total.toFixed(2)}`, 165, calcY + 16);

  // ─── 7. NOTES ────────────────────────────────────────────────────────
  const notesY = calcY + 30;
  if (invoice.notes || trip.notes) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Notes:', 14, notesY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const notesStr = invoice.notes || trip.notes;
    const splitNotes = doc.splitTextToSize(notesStr, 180);
    doc.text(splitNotes, 14, notesY + 5);
  }

  // ─── 8. FOOTER ───────────────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Thank you for your business!', 14, 280);
  doc.text('Invoice automatically generated by HapTrans SaaS', 125, 280);

  return doc.output('datauristring');
}
