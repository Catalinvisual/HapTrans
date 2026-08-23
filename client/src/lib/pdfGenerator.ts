import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CompanySettings } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';
import { fmtNumber } from './format';

// ─── Formatting Helpers ────────────────────────────────────────────────────────

function normalizeText(text: string): string {
  if (!text) return '';
  return text
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

async function addImageToDoc(doc: jsPDF, url: string, x: number, y: number, maxWidth: number, maxHeight: number) {
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      doc.addImage(img, 'PNG', x, y, w, h);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = url;
  });
}

async function createBaseDocument(title: string, company: CompanySettings | null, orientation: 'portrait' | 'landscape' = 'landscape') {
  const doc = new jsPDF(orientation, 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Calculate dynamic header height
  let headerHeight = 120; // default
  if (company) {
    let detailsCount = [company.address, company.cui, company.iban, company.email, company.phone].filter(Boolean).length;
    headerHeight = 40 + (company.logo ? 60 : 0) + 15 + (detailsCount * 12) + 15;
    if (headerHeight < 100) headerHeight = 100;
  }

  let cursorY = 40;

  // Header Background
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  let leftCursorY = cursorY;

  // Left Side: Logo & Company Details
  if (company) {
    if (company.logo) {
      const logoMaxWidth = 180;
      const logoMaxHeight = 60;
      await addImageToDoc(doc, company.logo, 40, 20, logoMaxWidth, logoMaxHeight);
      leftCursorY = 20 + logoMaxHeight + 15; // Move below logo
    } else {
      leftCursorY = cursorY;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(normalizeText(company.name || 'Company'), 40, leftCursorY);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const details = [
      company.address ? normalizeText(`${company.address}, ${company.city || ''} ${company.country || ''}`.trim()) : null,
      company.cui ? `VAT: ${company.cui}` : null,
      company.iban ? `IBAN: ${company.iban}` : null,
      company.email ? `Email: ${company.email}` : null,
      company.phone ? `Phone: ${company.phone}` : null,
    ].filter(Boolean) as string[];

    details.forEach(det => {
      leftCursorY += 12;
      doc.text(det, 40, leftCursorY);
    });
  }

  // Right Side: Title & Date
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18); // Slightly smaller
  doc.setTextColor(30, 41, 59); // text-slate-800
  
  const titleWidth = doc.getStringUnitWidth(normalizeText(title)) * 18;
  doc.text(normalizeText(title), pageWidth - 40 - titleWidth, cursorY + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // text-slate-500
  
  const user = useAuthStore.getState().user;
  const userName = user?.name || user?.email || '';
  const datePrefix = userName ? `${normalizeText(userName)} : Generated: ` : 'Generated: ';
  const dateStr = `${datePrefix}${fmtDateTime(new Date())}`;
  const dateWidth = doc.getStringUnitWidth(dateStr) * 10;
  doc.text(dateStr, pageWidth - 40 - dateWidth, cursorY + 32);

  // Draw separator line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(1);
  doc.line(40, headerHeight, pageWidth - 40, headerHeight);

  return { doc, pageWidth, startY: headerHeight + 30 };
}

// ─── Generators ──────────────────────────────────────────────────────────────

export async function generateOrderPdf(order: any, company: CompanySettings | null) {
  const { doc, startY } = await createBaseDocument(`Transport Order: ${order?.orderNumber || 'N/A'}`, company, 'landscape');
  let currentY = startY;

  // Order Info Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('General Information', 40, currentY);
  currentY += 15;

  autoTable(doc, {
    startY: currentY,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3, textColor: [71, 85, 105] },
    columnStyles: { 0: { fontStyle: 'bold', textColor: [30, 41, 59], cellWidth: 100 } },
    body: [
      ['Status', formatStatus(order?.status)],
      ['Client', normalizeText(order?.client?.name || '—')],
      ['Reference', normalizeText(order?.orderNumber || order?.referenceNumber || order?.customerReference || '—')],
      ['Price', `EUR ${order?.price || 0}`],
      ['Transport Type', (order?.transportType || 'ftl').toUpperCase()],
    ],
    margin: { left: 40 },
  });
  currentY = (doc as any).lastAutoTable.finalY + 30;

  // Stops Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('Route & Stops', 40, currentY);
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
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [71, 85, 105] },
      alternateRowStyles: { fillColor: [250, 252, 253] },
      margin: { left: 40, right: 40 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 30;
  }

  // Cargo Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('Cargo Details', 40, currentY);
  currentY += 10;

  const cargoData = (order?.cargoItems || []).map((c: any) => {
    return [
      normalizeText(c.description || '—'),
      c.quantity || '0',
      c.unit || '—',
      c.weightKg ? `${c.weightKg} kg` : '—',
      c.ldm ? `${c.ldm} ldm` : '—'
    ];
  });

  if (cargoData.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [['Description', 'Qty', 'Unit', 'Weight', 'LDM']],
      body: cargoData,
      theme: 'grid',
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [71, 85, 105] },
      margin: { left: 40, right: 40 },
    });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('No cargo details provided.', 40, currentY + 10);
  }

  doc.save(`Order_${order?.orderNumber || 'Document'}.pdf`);
}

export async function generateClientPdf(client: any, company: CompanySettings | null) {
  const { doc, startY } = await createBaseDocument(`Client Profile: ${client?.name || 'N/A'}`, company, 'landscape');
  let currentY = startY;

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [['Field', 'Details']],
    styles: { fontSize: 10, cellPadding: 5 },
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

  doc.save(`Client_${client?.name?.replace(/[^a-z0-9]/gi, '_') || 'Profile'}.pdf`);
}

export async function generateTruckPdf(truck: any, company: CompanySettings | null) {
  const { doc, startY } = await createBaseDocument(`Truck Profile: ${truck?.plateNumber || 'N/A'}`, company, 'landscape');
  let currentY = startY;

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [['Specification', 'Value']],
    styles: { fontSize: 10, cellPadding: 5 },
    columnStyles: { 0: { fontStyle: 'bold', textColor: [30, 41, 59], cellWidth: 150, fillColor: [248, 250, 252] } },
    body: [
      ['Plate Number', truck?.plateNumber || '—'],
      ['Brand & Model', `${truck?.brand || ''} ${truck?.model || ''}`.trim() || '—'],
      ['Status', truck?.status?.toUpperCase() || '—'],
      ['Max Weight (kg)', truck?.maxWeightKg ? truck.maxWeightKg.toString() : '—'],
      ['Max Pallets', truck?.maxPallets ? truck.maxPallets.toString() : '—'],
      ['Fuel Type', truck?.fuelType || '—'],
      ['Emissions Class', truck?.emissionsClass || '—'],
      ['Current Driver', truck?.driver?.name || '—'],
      ['Odometer', truck?.currentOdometer ? `${fmtNumber(truck.currentOdometer)} km` : '—'],
    ],
    margin: { left: 40, right: 40 },
  });

  doc.save(`Truck_${truck?.plateNumber || 'Specs'}.pdf`);
}

export async function generateTrailerPdf(trailer: any, company: CompanySettings | null) {
  const { doc, startY } = await createBaseDocument(`Trailer Profile: ${trailer?.plateNumber || 'N/A'}`, company, 'landscape');
  let currentY = startY;

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [['Specification', 'Value']],
    styles: { fontSize: 10, cellPadding: 5 },
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

  doc.save(`Trailer_${trailer?.plateNumber || 'Specs'}.pdf`);
}
