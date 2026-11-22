import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  drawPdfHeader, finishPdf, pdfDate, pdfDateTime, pdfSafe, pdfSectionTitle,
  PDF_HEAD_STYLES, PDF_TABLE_STYLES,
} from './pdfTheme';

/**
 * Renders a stored report snapshot to PDF. The PDF is generated from the
 * frozen snapshot, not from live queries, so a finalized report always prints
 * the figures that were finalized.
 */
export async function generateEmissionReportPdf(report: any, companyName?: string) {
  const snapshot = report.snapshot || {};
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const title = report.title || snapshot.reportTitle || 'CO2 report';
  const period = `${pdfDate(report.periodStart)} - ${pdfDate(report.periodEnd)}`;
  const header = await drawPdfHeader(doc, {
    title,
    subtitle: [report.reportNumber, period].filter(Boolean).join(' · '),
    unit: 'mm',
    meta: companyName ? [companyName] : [],
  });
  let y = header.startY;

  const status = String(report.status || '').replace(/_/g, ' ');
  const metaRows: Array<[string, string]> = [
    ['Report ID', String(report.reportNumber || '—')],
    ['Period', period],
    ['Methodology', String(report.methodology || snapshot.methodology || '—')],
    ['Engine version', String(report.engineVersion || '—')],
    ['Unit', String(snapshot.unit || 'kg CO2e')],
    ['Created', report.createdAt ? pdfDateTime(report.createdAt) : '—'],
    ['Status', status ? status.charAt(0).toUpperCase() + status.slice(1) : '—'],
    ['Finalized', report.finalizedAt ? pdfDateTime(report.finalizedAt) : '—'],
    ['Checksum', String(report.checksum || '—')],
  ];
  autoTable(doc, {
    startY: y,
    body: metaRows,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: { top: 1.1, bottom: 1.1, left: 0, right: 2 }, textColor: [70, 80, 95] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 32, textColor: [15, 23, 42] } },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  pdfSectionTitle(doc, 'Key figures', 14, y);
  y += 4;

  const kpis = snapshot.kpis || {};
  const summaryRows = [
    ['Total WTW', fmt(kpis.wtwKg), 'kg CO2e'],
    ['Tank-to-wheel (TTW)', fmt(kpis.ttwKg), 'kg CO2e'],
    ['Well-to-tank (WTT)', fmt(kpis.wttKg), 'kg CO2e'],
    ['Distance', fmt(kpis.distanceKm), 'km'],
    ['Empty running', fmt(kpis.emptyKm), 'km'],
    ['Energy', fmt(kpis.energyQuantity), 'L / kWh'],
    ['Trips', fmt(kpis.trips), ''],
    ['Missing data', kpis.missingDataPercent == null ? '—' : `${kpis.missingDataPercent}%`, 'of trips'],
    ['Estimated trips', fmt(kpis.estimatedTrips), ''],
    ['Verified trips', fmt(kpis.verifiedTrips), ''],
  ];
  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value', 'Unit']],
    body: summaryRows,
    theme: 'grid',
    styles: PDF_TABLE_STYLES,
    headStyles: { ...PDF_HEAD_STYLES, fontSize: 8 },
    alternateRowStyles: { fillColor: [250, 250, 251] },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' }, 2: { cellWidth: 28 } },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 9;

  for (const section of snapshot.sections || []) {
    if (!section.rows?.length) continue;
    if (y > 250) { doc.addPage(); y = 24; }
    pdfSectionTitle(doc, String(section.title || section.key), 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [section.columns.map((c: any) => pdfSafe(c.label))],
      body: section.rows.slice(0, 400).map((row: any) =>
        section.columns.map((c: any) => {
          const value = row[c.key];
          if (value === null || value === undefined) return '—';
          if (c.type === 'number' && typeof value === 'number') return formatNumber(value);
          return pdfSafe(value);
        })),
      theme: 'striped',
      styles: { ...PDF_TABLE_STYLES, fontSize: 7.2, cellPadding: 1.6 },
      headStyles: { ...PDF_HEAD_STYLES, fontSize: 7.2 },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 9;
  }

  if (snapshot.factorSources?.length) {
    if (y > 235) { doc.addPage(); y = 24; }
    pdfSectionTitle(doc, 'Emission factors and sources', 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [['Factor', 'Fuel', 'Unit', 'TTW', 'WTT', 'Dataset', 'Source']],
      body: snapshot.factorSources.map((f: any) => [
        pdfSafe(f.code), pdfSafe(f.fuelType), pdfSafe(f.unit), fmt(f.ttw), fmt(f.wtt), pdfSafe(f.dataset), pdfSafe(f.source),
      ]),
      theme: 'grid',
      styles: { ...PDF_TABLE_STYLES, fontSize: 6.8, cellPadding: 1.4 },
      headStyles: { ...PDF_HEAD_STYLES, fontSize: 6.8 },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 9;
  }

  if (snapshot.methodology) {
    if (y > 235) { doc.addPage(); y = 24; }
    pdfSectionTitle(doc, 'Methodology and data quality', 14, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(70, 80, 95);
    const methodologyLines = doc.splitTextToSize(pdfSafe(snapshot.methodology), 182);
    doc.text(methodologyLines, 14, y);
  }

  finishPdf(doc);
  return doc;
}

function fmt(value: unknown): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return formatNumber(Number(value));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 3 }).format(value);
}
