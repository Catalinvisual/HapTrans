// CMR / vrachtbrief and day sheet documents for the planning board.
//
// Both are printed from the same company header as the other HapCargo PDFs so a
// dispatcher can hand them to a driver without reformatting anything. Nothing is
// invented: empty fields print an em dash, and totals are only summed from the
// values that actually exist.

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { CompanySettings } from '../store/settingsStore';
import { fmtNumber } from './format';
import { createBaseDocument } from './pdfGenerator';
import { getCleanOrderFilename, getCleanTripFilename } from './filenameUtils';

const normalizeText = (text: any): string => {
  if (!text) return '';
  return String(text)
    .replace(/ș/g, 's')
    .replace(/Ș/g, 'S')
    .replace(/ț/g, 't')
    .replace(/Ț/g, 'T')
    .replace(/ă/g, 'a')
    .replace(/Ă/g, 'A')
    .replace(/î/g, 'i')
    .replace(/Î/g, 'I')
    .replace(/â/g, 'a')
    .replace(/Â/g, 'A');
};

const fmtDateTime = (value: any): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : format(date, 'dd/MM/yyyy HH:mm');
};

const formatStatus = (status: any): string => {
  if (!status) return '—';
  return String(status)
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const joined = (...parts: any[]): string =>
  normalizeText(parts.filter(Boolean).join(', ') || '—');

const cargoRows = (order: any) => {
  const items = Array.isArray(order?.cargoItems) ? order.cargoItems : [];
  const rows = items.map((item: any, index: number) => [
    index + 1,
    normalizeText(item?.description || item?.name || '—'),
    item?.quantity ?? '',
    item?.palletType || '',
    item?.weightKg ? `${fmtNumber(item.weightKg)} kg` : '',
    item?.volumeM3 ? `${fmtNumber(item.volumeM3)} m3` : '',
  ]);
  if (rows.length) return rows;
  return [
    [
      1,
      normalizeText(order?.cargoDetails || 'General cargo'),
      order?.pallets ?? '',
      order?.palletType || '',
      order?.weightKg ? `${fmtNumber(order.weightKg)} kg` : '',
      '',
    ],
  ];
};

/**
 * CMR / vrachtbrief for one order: parties, places of taking over and delivery,
 * the goods table and the three signature blocks of the paper form.
 */
export async function generateCmrPdf(
  order: any,
  company: CompanySettings | null,
  options?: { autoSave?: boolean },
) {
  const orderNum =
    order?.orderNumber ||
    order?.referenceNumber ||
    (order?.id ? `ORD-${String(order.id).slice(0, 8)}` : 'Order');
  const { doc, startY } = await createBaseDocument(
    `CMR / Vrachtbrief: ${orderNum}`,
    company,
    'portrait',
  );
  let currentY = startY;

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [['CMR', 'Details']],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 140, fillColor: [248, 250, 252] },
      1: { cellWidth: 300 },
    },
    body: [
      ['1. Sender', joined(order?.pickupCompanyName || order?.client?.name, order?.pickupAddress, order?.pickupCity, order?.pickupCountry)],
      ['2. Consignee', joined(order?.dropoffCompanyName || order?.client?.name, order?.dropoffAddress, order?.dropoffCity, order?.dropoffCountry)],
      ['3. Place of taking over', joined(order?.pickupCity, order?.pickupCountry)],
      ['4. Place of delivery', joined(order?.dropoffCity, order?.dropoffCountry)],
      ['5. Date of taking over', fmtDateTime(order?.pickupDate || order?.appointmentFrom)],
      ['6. CMR reference', normalizeText(order?.cmrReference || orderNum)],
      ['7. Carrier', normalizeText(company?.name || '—')],
      ['8. Loading reference', normalizeText(order?.loadingReference || '—')],
      ['9. Unloading reference', normalizeText(order?.unloadingReference || '—')],
    ],
    margin: { left: 40, right: 40 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 16;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('10. Goods', 40, currentY);

  autoTable(doc, {
    startY: currentY + 6,
    theme: 'grid',
    head: [['#', 'Description', 'Qty', 'Pallet type', 'Weight', 'Volume']],
    styles: { fontSize: 8.5, cellPadding: 4 },
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' },
      1: { cellWidth: 195 },
      2: { cellWidth: 50, halign: 'right' },
      3: { cellWidth: 65 },
      4: { cellWidth: 55, halign: 'right' },
      5: { cellWidth: 55, halign: 'right' },
    },
    body: cargoRows(order),
    margin: { left: 40, right: 40 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 16;

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [['11. Instructions', 'Details']],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 140, fillColor: [248, 250, 252] },
      1: { cellWidth: 300 },
    },
    body: [
      ['Special agreements', normalizeText(order?.notes || '—')],
      ['ADR', order?.adrSurcharge ? 'Yes' : 'No'],
      ['Total weight', order?.weightKg ? `${fmtNumber(order.weightKg)} kg` : '—'],
      ['Total pallets', order?.pallets ? String(order.pallets) : '—'],
    ],
    margin: { left: 40, right: 40 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 34;

  const pageWidth = doc.internal.pageSize.getWidth();
  const blockWidth = (pageWidth - 80 - 30) / 3;
  ['Sender', 'Carrier', 'Consignee'].forEach((label, index) => {
    const x = 40 + index * (blockWidth + 15);
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.6);
    doc.line(x, currentY, x + blockWidth, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${label} — signature & date`, x, currentY + 11);
  });

  const filename = getCleanOrderFilename(orderNum, order?.client?.name);
  if (options?.autoSave !== false) doc.save(filename);
  return { doc, blob: doc.output('blob'), filename };
}

/**
 * Day sheet for one trip: driver, truck, every stop with its window and ETA, and
 * the cargo totals the gate needs. Signature lines for driver and dispatcher.
 */
export async function generateDaySheetPdf(
  trip: any,
  company: CompanySettings | null,
  options?: { autoSave?: boolean },
) {
  const tripNum =
    trip?.tripNumber ||
    trip?.referenceNumber ||
    (trip?.id ? `TRP-${String(trip.id).slice(0, 8)}` : 'Trip');
  const { doc, startY } = await createBaseDocument(`Day sheet: ${tripNum}`, company, 'portrait');
  let currentY = startY;

  const driverName = trip?.driver?.name || trip?.driver?.user?.name || '—';
  const truckPlate = trip?.truck?.plateNumber || '—';
  const trailerPlate = trip?.trailer?.plateNumber || '—';
  const stops = (trip?.stops || []).slice().sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));
  const pallets = stops.reduce((sum: number, stop: any) => sum + (Number(stop?.pallets) || 0), 0);
  const weightKg = stops.reduce((sum: number, stop: any) => sum + (Number(stop?.weightKg) || 0), 0);

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [['Trip', 'Details']],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 150, fillColor: [248, 250, 252] },
      1: { cellWidth: 320 },
    },
    body: [
      ['Trip reference', tripNum],
      ['Status', formatStatus(trip?.status)],
      ['Truck / trailer', normalizeText(`${truckPlate} / ${trailerPlate}`)],
      ['Driver', normalizeText(driverName)],
      ['Planned departure', fmtDateTime(trip?.plannedDeparture)],
      ['Planned arrival', fmtDateTime(trip?.plannedArrival)],
      ['Distance', trip?.distanceKm ? `${fmtNumber(trip.distanceKm)} km` : '—'],
      ['Cargo on board', `${pallets} pallet(s) · ${weightKg ? `${fmtNumber(weightKg)} kg` : '—'}`],
    ],
    margin: { left: 40, right: 40 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 16;

  const windowText = (stop: any) => {
    const from = stop?.timeWindowMin ? fmtDateTime(stop.timeWindowMin) : null;
    const to = stop?.timeWindowMax ? fmtDateTime(stop.timeWindowMax) : null;
    if (from && to) return `${from} – ${to}`;
    return from || to || '—';
  };

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [['#', 'Type', 'Location', 'Window', 'ETA', 'Pallets', 'Weight', 'Notes']],
    styles: { fontSize: 8, cellPadding: 3.5 },
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
    // Let autoTable size these columns: fixed widths pushed the widest cell past
    // the printable area of a portrait page.
    columnStyles: {
      0: { halign: 'center' },
      1: { fontStyle: 'bold' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
    body: stops.length
      ? stops.map((stop: any, index: number) => [
          index + 1,
          String(stop?.type || 'stop').toUpperCase(),
          joined(stop?.companyName, stop?.city, stop?.address),
          windowText(stop),
          fmtDateTime(stop?.eta || stop?.plannedDate),
          stop?.pallets ?? '',
          stop?.weightKg ? fmtNumber(stop.weightKg) : '',
          normalizeText(stop?.notes || ''),
        ])
      : [[1, '—', 'No stops on this trip', '—', '—', '', '', '']],
    margin: { left: 40, right: 40 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 40;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.6);
  doc.line(40, currentY, 260, currentY);
  doc.line(320, currentY, 530, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Driver signature', 40, currentY + 11);
  doc.text('Dispatcher signature', 320, currentY + 11);

  const filename = getCleanTripFilename(tripNum, truckPlate);
  if (options?.autoSave !== false) doc.save(filename);
  return { doc, blob: doc.output('blob'), filename };
}
