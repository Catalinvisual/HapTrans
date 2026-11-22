import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Renders a stored report snapshot to PDF. The PDF is generated from the
 * frozen snapshot, not from live queries, so a finalized report always prints
 * the figures that were finalized.
 */
export function generateEmissionReportPdf(report: any, companyName: string) {
  const snapshot = report.snapshot || {};
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const orange: [number, number, number] = [255, 90, 0];
  const navy: [number, number, number] = [13, 27, 42];

  doc.setFillColor(...navy);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setFillColor(...orange);
  doc.rect(0, 30, 210, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('HapCargo', 14, 14);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('CO₂ & Environmental Management', 14, 21);
  doc.text(companyName || '', 196, 14, { align: 'right' });
  doc.text(report.reportNumber || '', 196, 21, { align: 'right' });

  doc.setTextColor(...navy);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(report.title || snapshot.reportTitle || 'CO₂ report', 14, 42);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 80, 95);
  const meta = [
    `Report ID: ${report.reportNumber || '—'}`,
    `Period: ${report.periodStart} → ${report.periodEnd}`,
    `Methodology: ${snapshot.methodology ? 'EN ISO 14083:2023 concepts (WTW)' : report.methodology}`,
    `Engine version: ${report.engineVersion}`,
    `Unit: ${snapshot.unit || 'kg CO2e'}`,
    `Created: ${new Date(report.createdAt || Date.now()).toLocaleString()}`,
    `Status: ${report.status}${report.finalizedAt ? ` (finalized ${new Date(report.finalizedAt).toLocaleString()})` : ''}`,
    `Checksum: ${report.checksum || '—'}`,
  ];
  meta.forEach((line, i) => doc.text(line, 14, 49 + i * 4.2));

  let y = 49 + meta.length * 4.2 + 4;
  doc.setDrawColor(225, 230, 236);
  doc.line(14, y, 196, y);
  y += 6;

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
    styles: { fontSize: 8, cellPadding: 1.8, textColor: [40, 48, 60] },
    headStyles: { fillColor: navy, textColor: 255, fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  for (const section of snapshot.sections || []) {
    if (!section.rows?.length) continue;
    if (y > 245) { doc.addPage(); y = 20; }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...navy);
    doc.text(String(section.title || section.key), 14, y);
    y += 3;
    autoTable(doc, {
      startY: y,
      head: [section.columns.map((c: any) => c.label)],
      body: section.rows.slice(0, 400).map((row: any) =>
        section.columns.map((c: any) => {
          const value = row[c.key];
          if (value === null || value === undefined) return '—';
          if (c.type === 'number' && typeof value === 'number') return formatNumber(value);
          return String(value);
        })),
      theme: 'striped',
      styles: { fontSize: 7, cellPadding: 1.4, overflow: 'linebreak' },
      headStyles: { fillColor: [240, 243, 247], textColor: navy, fontSize: 7 },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  if (snapshot.factorSources?.length) {
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...navy);
    doc.text('Emission factors and sources', 14, y);
    y += 3;
    autoTable(doc, {
      startY: y,
      head: [['Factor', 'Fuel', 'Unit', 'TTW', 'WTT', 'Dataset', 'Source']],
      body: snapshot.factorSources.map((f: any) => [
        f.code, f.fuelType, f.unit, fmt(f.ttw), fmt(f.wtt), f.dataset, f.source,
      ]),
      theme: 'grid',
      styles: { fontSize: 6.5, cellPadding: 1.2 },
      headStyles: { fillColor: navy, textColor: 255, fontSize: 6.5 },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  if (y > 230) { doc.addPage(); y = 20; }
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navy);
  doc.text('Methodology and data quality', 14, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 80, 95);
  const methodologyLines = doc.splitTextToSize(String(snapshot.methodology || ''), 182);
  doc.text(methodologyLines, 14, y);

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(140, 148, 160);
    doc.text(`HapCargo TMS · ${report.reportNumber || ''} · engine ${report.engineVersion}`, 14, 290);
    doc.text(`${i} / ${pageCount}`, 196, 290, { align: 'right' });
  }

  return doc;
}

function fmt(value: unknown): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return formatNumber(Number(value));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 3 }).format(value);
}
