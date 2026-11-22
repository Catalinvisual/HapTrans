import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CompanySettings } from '../store/settingsStore';
import { format } from 'date-fns';
import { fmtNumber } from './format';
import i18n from './i18n';
import { fuelTypeLabel, getTruckFuelProfile } from './truckFuel';
import { getCleanOrderFilename, getCleanProfileFilename, getCleanTripFilename } from './filenameUtils';
import { composeAddress } from './address';
import { transportTypeLabel } from './transportType';
import { driverDisplayName, driverEntityDisplayName } from './driverName';
import { drawPdfHeader, finishPdf, pdfSafe, pdfSectionTitle } from './pdfTheme';

// ─── Formatting Helpers ────────────────────────────────────────────────────────

function normalizeText(text: string): string {
  return pdfSafe(text);
}

function formatStatus(status: string): string {
  if (!status) return '—';
  return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}


const fmtDate = (d: any) => {
  if (!d) return '—';
  const x = new Date(d);
  return isNaN(x.getTime()) ? '—' : format(x, 'dd/MM/yyyy');
};
const fmtDateTime = (d: any) => {
  if (!d) return '—';
  const x = new Date(d);
  return isNaN(x.getTime()) ? '—' : format(x, 'dd/MM/yyyy HH:mm');
};

// ─── Base Document Setup ─────────────────────────────────────────────────────

export async function createBaseDocument(title: string, company: CompanySettings | null, orientation: 'portrait' | 'landscape' = 'landscape') {
  const doc = new jsPDF(orientation, 'pt', 'a4');
  const header = await drawPdfHeader(doc, {
    title,
    company,
    unit: 'pt',
    details: company
      ? [
          company.name || '',
          company.address ? `${company.address}, ${company.city || ''} ${company.country || ''}`.trim() : '',
          company.cui ? `VAT: ${company.cui}` : '',
          company.iban ? `IBAN: ${company.iban}` : '',
          company.email ? `Email: ${company.email}` : '',
          company.phone ? `Phone: ${company.phone}` : '',
        ].filter(Boolean)
      : [],
  });
  return { doc, pageWidth: header.pageWidth, startY: header.startY, title };
}

// ─── Generators ──────────────────────────────────────────────────────────────

export async function generateOrderPdf(order: any, company: CompanySettings | null, options?: { autoSave?: boolean }) {
  const { doc, startY } = await createBaseDocument(`Transport Order: ${order?.orderNumber || 'N/A'}`, company, 'landscape');
  let currentY = startY;

  // Order Info Section
  pdfSectionTitle(doc, 'General Information', 40, currentY, 'pt');
  currentY += 15;

  // The order number and the customer's reference already appear in the stop and
  // order blocks below, so the header block does not repeat them.
  autoTable(doc, {
    startY: currentY,
    theme: 'plain',
    styles: { halign: 'left', fontSize: 10, cellPadding: 3, textColor: [71, 85, 105] },
    columnStyles: { 0: { fontStyle: 'bold', textColor: [30, 41, 59], cellWidth: 100 } },
    body: [
      ['Status', formatStatus(order?.status)],
      ['Client', normalizeText(order?.client?.name || '—')],
      ['Price', `€ ${order?.price || 0}`],
      ['Transport Type', transportTypeLabel(order?.transportType)],
      ['ADR Status', (order?.isAdr || (order?.adrStatus && order?.adrStatus !== 'none')) ? `${(order?.adrStatus || 'ADR').toUpperCase()} (${order?.adrTotalPoints || 0} pts${order?.adrExemptionApplied ? ` - ${order?.adrExemptionApplied}` : ''})` : 'Not Applicable (Non-hazardous)'],
    ],
    margin: { left: 40 },
  });
  currentY = (doc as any).lastAutoTable.finalY + 30;

  // Stops Section
  pdfSectionTitle(doc, 'Route & Stops', 40, currentY, 'pt');
  currentY += 10;

  const stopsData = (order?.stops || []).sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0)).map((s: any, i: number) => {
    const isPickup = s.type === 'pickup';
    const isDropoff = s.type === 'dropoff';
    const typeStr = (isPickup ? 'PICKUP' : 'DELIVERY');
    
    let finalAddr = s.address || '';
    if (s.city && !finalAddr.includes(s.city)) {
       finalAddr += (finalAddr ? ', ' : '') + s.city;
    }
    if (s.country && !finalAddr.includes(s.country)) {
       finalAddr += (finalAddr ? ', ' : '') + s.country;
    }
    const address = [s.companyName, finalAddr].filter(Boolean).join('\n');
    
    const date = `${fmtDate(s.dateFrom)}${s.timeFrom ? ' ' + s.timeFrom : ''}`;

    let ref = s.reference;
    if (isPickup && order?.loadingReference) ref = order.loadingReference;
    if (isDropoff && order?.unloadingReference) ref = order.unloadingReference;
    if (!ref || ref.toLowerCase() === 'loading' || ref.toLowerCase() === 'unloading') {
       if (isPickup) ref = order?.loadingReference || order?.customerReference || '—';
       else if (isDropoff) ref = order?.unloadingReference || order?.customerReference || '—';
       else ref = '—';
    }

    return [i + 1, typeStr, normalizeText(address), date, normalizeText(ref)];
  });

  if (stopsData.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Type', 'Location', 'Date/Time', 'Reference']],
      body: stopsData,
      theme: 'grid',
      headStyles: { halign: 'left', fillColor: [255, 237, 227], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { halign: 'left', fontSize: 9, textColor: [71, 85, 105] },
      alternateRowStyles: { fillColor: [250, 252, 253] },
      margin: { left: 40, right: 40 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 30;
  }

  // Cargo Section
  pdfSectionTitle(doc, 'Cargo Details', 40, currentY, 'pt');
  currentY += 10;

  const cargoData = (order?.cargoItems || []).map((c: any) => {
    return [
      normalizeText(c.description || '—'),
      c.quantity || '0',
      c.unit || '—',
      c.weightKg ? `${c.weightKg} kg` : '—',
      c.ldm ? `${c.ldm} ldm` : '—',
      (c.isAdr || c.unNumber) ? normalizeText(`${c.unNumber || 'ADR'} (Cls ${c.adrClass || '—'})`) : '—'
    ];
  });

  if (cargoData.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [['Description', 'Qty', 'Unit', 'Weight', 'LDM', 'ADR']],
      body: cargoData,
      theme: 'grid',
      headStyles: { halign: 'left', fillColor: [255, 237, 227], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { halign: 'left', fontSize: 9, textColor: [71, 85, 105] },
      margin: { left: 40, right: 40 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 25;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('No cargo details provided.', 40, currentY + 10);
    currentY += 25;
  }

  // Official ADR 5.4 Dangerous Goods Transport Section
  const adrItems = (order?.cargoItems || []).filter((c: any) => c.isAdr || c.unNumber || c.adrClass);
  if (adrItems.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text('ADR 5.4 Dangerous Goods Transport Declaration (Regulament ADR UNECE)', 40, currentY);
    currentY += 8;

    const adrTableData = adrItems.map((c: any, i: number) => [
      i + 1,
      c.unNumber || '—',
      normalizeText(c.properShippingName || c.description || '—'),
      c.adrClass || '—',
      c.packingGroup || '—',
      c.tunnelRestrictionCode ? `(${c.tunnelRestrictionCode})` : '—',
      c.transportCategory !== undefined ? String(c.transportCategory) : '—',
      c.adrPoints !== undefined ? `${c.adrPoints} pts` : '—',
      normalizeText(c.adrDeclarationText || `${c.unNumber || ''} ${c.properShippingName || ''}, ${c.adrClass || ''}`)
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'UN #', 'Proper Shipping Name', 'Class', 'PG', 'Tunnel', 'Cat', 'Points', 'ADR 5.4 Declaration']],
      body: adrTableData,
      theme: 'grid',
      headStyles: { halign: 'left', fillColor: [255, 237, 227], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { halign: 'left', fontSize: 8, textColor: [30, 41, 59] },
      columnStyles: { 8: { fontStyle: 'bold', cellWidth: 220 } },
      margin: { left: 40, right: 40 },
    });
  }

  const rawNum = (order?.orderNumber || order?.customerReference || '').trim();
  const clientName = order?.client?.name || order?.clientName;
  const filename = getCleanOrderFilename(rawNum, clientName);
  finishPdf(doc);
  if (options?.autoSave !== false) {
    doc.save(filename);
  }

  return { doc, blob: doc.output('blob'), filename };
}

export async function generateClientPdf(client: any, company: CompanySettings | null, options?: { autoSave?: boolean }) {
  const { doc, startY } = await createBaseDocument(`Client Profile: ${client?.name || 'N/A'}`, company, 'landscape');
  let currentY = startY;

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [['Field', 'Details']],
    styles: { halign: 'left', fontSize: 10, cellPadding: 5 },
    columnStyles: { 0: { fontStyle: 'bold', textColor: [30, 41, 59], cellWidth: 150, fillColor: [248, 250, 252] } },
    body: [
      ['Client Name', client?.name || '—'],
      ['Registration Number', client?.regNo || '—'],
      ['VAT Number', client?.vatNo || '—'],
      ['Type', client?.type?.toUpperCase() || '—'],
      ['Address', `${client?.address || ''}\n${client?.city || ''} ${client?.postalCode || ''}\n${client?.country || ''}`.trim() || '—'],
      ['Contact Email', client?.email || '—'],
      ['Contact Phone', client?.phone || '—'],
      ['Payment Terms', client?.paymentTermsDays ? `${client.paymentTermsDays} days` : '—'],
      ['Status', client?.status || 'active'],
    ],
    margin: { left: 40, right: 40 },
  });

  const filename = getCleanProfileFilename('Client', client?.name);
  finishPdf(doc);
  if (options?.autoSave !== false) {
    doc.save(filename);
  }

  return { doc, blob: doc.output('blob'), filename };
}

export async function generateTruckPdf(truck: any, company: CompanySettings | null, options?: { autoSave?: boolean }) {
  const { doc, startY } = await createBaseDocument(`Truck Profile: ${truck?.plateNumber || 'N/A'}`, company, 'landscape');
  let currentY = startY;

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [['Specification', 'Value']],
    styles: { halign: 'left', fontSize: 10, cellPadding: 5 },
    columnStyles: { 0: { fontStyle: 'bold', textColor: [30, 41, 59], cellWidth: 150, fillColor: [248, 250, 252] } },
    body: [
      ['Plate Number', truck?.plateNumber || '—'],
      ['Brand & Model', `${truck?.brand || ''} ${truck?.model || ''}`.trim() || '—'],
      [i18n.t('vin', 'VIN'), truck?.vin || '—'],
      [i18n.t('registration_country', 'Registration country'), truck?.registrationCountry || '—'],
      ['Status', truck?.status?.toUpperCase() || '—'],
      ['Max Weight (kg)', truck?.maxWeightKg ? truck.maxWeightKg.toString() : '—'],
      ['Max Pallets', truck?.maxPallets ? truck.maxPallets.toString() : '—'],
      [i18n.t('truck_fuel_type', 'Fuel / energy type'), truck?.fuelType ? fuelTypeLabel(truck.fuelType, i18n.t.bind(i18n)) : i18n.t('truck_fuel_not_configured', 'Fuel type not configured')],
      [i18n.t('truck_fuel_consumption', 'Consumption'), truck?.fuelConsumption ? `${fmtNumber(truck.fuelConsumption, 1)} ${getTruckFuelProfile(truck.fuelType)?.unit || ''}`.trim() : '—'],
      [i18n.t('euronorm', 'Emission Standard'), truck?.euronorm || '—'],
      ['Current Driver', driverEntityDisplayName(truck?.driver)],
      ['Odometer', truck?.currentOdometer ? `${fmtNumber(truck.currentOdometer)} km` : '—'],
    ],
    margin: { left: 40, right: 40 },
  });

  const filename = getCleanProfileFilename('Truck', truck?.plateNumber);
  finishPdf(doc);
  if (options?.autoSave !== false) {
    doc.save(filename);
  }

  return { doc, blob: doc.output('blob'), filename };
}

export async function generateTrailerPdf(trailer: any, company: CompanySettings | null, options?: { autoSave?: boolean }) {
  const { doc, startY } = await createBaseDocument(`Trailer Profile: ${trailer?.plateNumber || 'N/A'}`, company, 'landscape');
  let currentY = startY;

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [['Specification', 'Value']],
    styles: { halign: 'left', fontSize: 10, cellPadding: 5 },
    columnStyles: { 0: { fontStyle: 'bold', textColor: [30, 41, 59], cellWidth: 150, fillColor: [248, 250, 252] } },
    body: [
      ['Plate Number', trailer?.plateNumber || '—'],
      ['Type', trailer?.type?.toUpperCase() || '—'],
      ['Status', trailer?.status?.toUpperCase() || '—'],
      ['Brand & Model', `${trailer?.brand || ''} ${trailer?.model || ''}`.trim() || '—'],
      ['Max Weight (kg)', trailer?.maxWeightKg ? trailer.maxWeightKg.toString() : '—'],
      ['Max Pallets', trailer?.maxPallets ? trailer.maxPallets.toString() : '—'],
      ['Volume (cbm)', trailer?.volumeCbm ? trailer.volumeCbm.toString() : '—'],
      ['Dimensions (L x W x H)', `${trailer?.lengthCm || 0} x ${trailer?.widthCm || 0} x ${trailer?.heightCm || 0} cm`],
    ],
    margin: { left: 40, right: 40 },
  });

  const filename = getCleanProfileFilename('Trailer', trailer?.plateNumber);
  finishPdf(doc);
  if (options?.autoSave !== false) {
    doc.save(filename);
  }

  return { doc, blob: doc.output('blob'), filename };
}

export async function generateDriverPdf(driver: any, company: CompanySettings | null, options?: { autoSave?: boolean }) {
  const driverName = driverEntityDisplayName(driver) || 'Driver';
  const { doc, startY } = await createBaseDocument(`Driver Profile: ${driverName}`, company, 'landscape');
  let currentY = startY;

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [['Information', 'Details']],
    styles: { halign: 'left', fontSize: 10, cellPadding: 5 },
    columnStyles: { 0: { fontStyle: 'bold', textColor: [30, 41, 59], cellWidth: 150, fillColor: [248, 250, 252] } },
    body: [
      ['Full Name', driverName],
      ['Email', driver?.user?.email || '—'],
      ['Phone', driver?.phone || driver?.user?.phone || '—'],
      ['Status', (driver?.status || 'active').toUpperCase()],
      ['License Number', driver?.licenseNumber || '—'],
      ['License Expiry', fmtDate(driver?.licenseExpiry)],
      ['Medical Expiry', fmtDate(driver?.medicalExpiry)],
      ['Tachograph Card Expiry', fmtDate(driver?.tachoCardExpiry)],
      ['Gross Salary', driver?.grossSalary ? `€${fmtNumber(driver.grossSalary)}` : (driver?.user?.grossSalary ? `€${fmtNumber(driver.user.grossSalary)}` : '—')],
      ['Daily Allowance', driver?.dailyRate ? `€${fmtNumber(driver.dailyRate)}` : (driver?.user?.dailyRate ? `€${fmtNumber(driver.user.dailyRate)}` : '—')],
      ['Assigned Truck', driver?.assignedTruck?.plateNumber || driver?.truck?.plateNumber || '—'],
    ],
    margin: { left: 40, right: 40 },
  });

  const filename = getCleanProfileFilename('Driver', driverName);
  finishPdf(doc);
  if (options?.autoSave !== false) {
    doc.save(filename);
  }

  return { doc, blob: doc.output('blob'), filename };
}

export async function generateTripPdf(trip: any, company: CompanySettings | null, options?: { autoSave?: boolean }) {
  const tripNum = trip?.tripNumber || trip?.referenceNumber || (trip?.id ? `TRP-${String(trip.id).slice(0, 8)}` : 'Trip');
  const { doc, startY } = await createBaseDocument(`Trip Sheet: ${tripNum}`, company, 'landscape');
  let currentY = startY;

  // Same resolver the trip page uses, so a driver attached to the truck or a
  // subcontractor driver is never printed as "—".
  const driverName = driverDisplayName(trip) || trip?.driverName || '—';
  const truckPlate = trip?.truck?.plateNumber || trip?.truckPlate || trip?.carrierTruckPlate || '—';
  // The trailer can hang on the trip or, when it was hooked to the truck, on
  // the truck record itself — the same fallback the trip page shows.
  const trailerPlate = trip?.trailer?.plateNumber || trip?.truck?.trailer?.plateNumber || trip?.trailerPlate || trip?.carrierTrailerPlate || '—';
  const dispatcherName = trip?.dispatcher?.name || trip?.dispatcher?.email || '—';
  const carrierName = trip?.carrierName || '—';

  // 1. Trip Specifications & Assignments Table
  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [['Trip Specification', 'Details', 'Planning & Timing', 'Schedule']],
    styles: { halign: 'left', fontSize: 9, cellPadding: 4 },
    headStyles: { halign: 'left', fillColor: [255, 237, 227], textColor: [15, 23, 42], fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120, fillColor: [248, 250, 252] },
      1: { cellWidth: 260 },
      2: { fontStyle: 'bold', cellWidth: 120, fillColor: [248, 250, 252] },
      3: { cellWidth: 260 },
    },
    body: [
      ['Status', formatStatus(trip?.status), 'Planned Departure', fmtDateTime(trip?.plannedDeparture)],
      ['Truck Plate', truckPlate, 'Planned Arrival', fmtDateTime(trip?.plannedArrival)],
      ['Trailer Plate', trailerPlate, 'Actual Departure', fmtDateTime(trip?.actualDeparture)],
      ['Assigned Driver', driverName, 'Actual Arrival', fmtDateTime(trip?.actualArrival)],
      ['Carrier (Subcontractor)', carrierName, 'Total Distance', trip?.distanceKm ? `${fmtNumber(trip.distanceKm)} km` : '—'],
      ['Dispatcher', dispatcherName, 'Orders', String((trip?.orders || []).length)],
    ],
    margin: { left: 40, right: 40 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 15;

  // 2. Stops / Route Schedule Table
  const stops = (trip?.stops || []).slice().sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));
  if (stops.length > 0) {
    pdfSectionTitle(doc, 'Route & Itinerary Stops', 40, currentY, 'pt');
    currentY += 6;

    const stopRows = stops.map((s: any, idx: number) => {
      const typeStr = (s.type || 'Stop').toUpperCase();
      const locStr = composeAddress(s);
      const schedStr = fmtDateTime(s.plannedDate || s.scheduledArrival || s.arrivalDate || s.time);
      const notes = normalizeText(s.notes || s.instructions || '—');
      return [
        idx + 1,
        typeStr,
        normalizeText(locStr || '—'),
        schedStr,
        notes,
      ];
    });

    autoTable(doc, {
      startY: currentY,
      theme: 'grid',
      head: [['#', 'Type', 'Location & Address', 'Scheduled Time', 'Instructions / Notes']],
      styles: { halign: 'left', fontSize: 8.5, cellPadding: 4 },
      headStyles: { halign: 'left', fillColor: [255, 237, 227], textColor: [15, 23, 42], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 65, fontStyle: 'bold' },
        2: { cellWidth: 320 },
        3: { cellWidth: 120 },
        4: { cellWidth: 230 },
      },
      body: stopRows,
      margin: { left: 40, right: 40 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  // 3. Attached Transport Orders Table
  const orders = trip?.orders || [];
  if (orders.length > 0) {
    pdfSectionTitle(doc, 'Assigned Transport Orders', 40, currentY, 'pt');
    currentY += 6;

    const orderRows = orders.map((o: any, idx: number) => {
      const orderRef = o.orderNumber || o.referenceNumber || `ORD-${String(o.id || '').slice(0, 8)}`;
      const client = o.client?.name || o.clientName || '—';
      const cargoSummary = (o.cargoItems || []).map((c: any) => `${c.quantity || 1}x ${c.description || 'cargo'}`).join('; ') || 'General cargo';
      const priceStr = o.price ? `€${fmtNumber(o.price)}` : '—';
      return [
        idx + 1,
        orderRef,
        normalizeText(client),
        normalizeText(cargoSummary),
        priceStr,
      ];
    });

    autoTable(doc, {
      startY: currentY,
      theme: 'grid',
      head: [['#', 'Order Reference', 'Client', 'Cargo Summary', 'Revenue']],
      styles: { halign: 'left', fontSize: 8.5, cellPadding: 4 },
      headStyles: { halign: 'left', fillColor: [255, 237, 227], textColor: [15, 23, 42], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 140, fontStyle: 'bold' },
        2: { cellWidth: 200 },
        3: { cellWidth: 300 },
        4: { cellWidth: 95 },
      },
      body: orderRows,
      margin: { left: 40, right: 40 },
    });
  }

  const rawTripNum = trip?.tripNumber || (trip?.id ? `TRP-${String(trip.id).slice(0, 8)}` : 'Trip');
  const tripIdentifier = trip?.truck?.plateNumber || driverName;
  const filename = getCleanTripFilename(rawTripNum, tripIdentifier);
  finishPdf(doc);
  if (options?.autoSave !== false) {
    doc.save(filename);
  }

  return { doc, blob: doc.output('blob'), filename };
}

