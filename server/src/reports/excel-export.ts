// ---------------------------------------------------------------------------
// Excel (.xlsx) report renderer built on exceljs.
//
// Layout per report:
//   Sheet "Report":   title, generated series (dates), KPI summary table
//   Sheet per table:  one data table each (the payload.tables array)
// ---------------------------------------------------------------------------

import { Workbook } from 'exceljs';
import type { Browser } from 'puppeteer-core';
import { ReportPayload, ReportTable, ReportColumn, ReportChart } from './reports.catalog';
import { renderChartPng } from './chart-renderer';

const HEADER_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF1D4E89' } };
const HEADER_FONT = { bold: true as const, color: { argb: 'FFFFFFFF' }, size: 11 };
const TITLE_FONT = { bold: true as const, size: 16, color: { argb: 'FF111827' } };
const META_FONT = { size: 10, color: { argb: 'FF6B7280' } };
const BORDER: any = {
  top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
};

const NUM_FORMATS: Record<string, string> = {
  currency: '\u20AC #,##0.00;\u20AC -#,##0.00',
  percent: '0.0"%"',
  number: '#,##0.00',
  date: 'yyyy-mm-dd',
  text: '@',
};

function fmtValue(v: any, type: string): string | number | null {
  if (v == null || v === '' || v === '—') {
    return type === 'date' ? '' : (v == null ? '' : String(v));
  }
  if (type === 'currency') return v;
  if (type === 'percent') return v;
  if (type === 'number') return v;
  if (type === 'date') return v;
  return String(v);
}

export async function buildReportWorkbook(p: ReportPayload, browser?: Browser): Promise<Workbook> {
  const wb = new Workbook();
  const ws = wb.addWorksheet('Report', { views: [{ state: 'frozen', ySplit: 2 }] });

  ws.mergeCells('A1:D1');
  ws.getCell('A1').value = p.reportName;
  ws.getCell('A1').font = TITLE_FONT;
  ws.getRow(1).height = 24;

  ws.mergeCells('A2:D2');
  ws.getCell('A2').value =
    `Period: ${fmtDate(p.period.from)} – ${fmtDate(p.period.to)}   |   Generated: ${fmtDate(p.generatedAt)}`;
  ws.getCell('A2').font = META_FONT;
  ws.getRow(2).height = 16;

  // ---- KPI summary ----
  const kpiSheet = wb.addWorksheet('KPI Summary', { views: [{ state: 'frozen', ySplit: 1 }] });
  kpiSheet.columns = [
    { header: 'KPI', key: 'label', width: 30 },
    { header: 'Value', key: 'value', width: 16 },
    { header: 'Unit', key: 'unit', width: 12 },
    { header: 'Trend', key: 'trend', width: 14 },
  ];
  styleHeaderRow(kpiSheet.getRow(1));
  kpiSheet.getRow(1).font = HEADER_FONT;
  for (const kpi of p.kpis) {
    const row = kpiSheet.addRow({
      label: kpi.label,
      value: kpi.value,
      unit: kpi.unit,
      trend: kpi.trend == null ? '' : `${kpi.trend > 0 ? '+' : ''}${kpi.trend}${kpi.unit === '%' ? 'pp' : ''}`,
    });
    row.eachCell((cell) => { cell.border = BORDER; });
    if (kpi.unit === 'EUR' || kpi.unit === 'EUR/km') {
      row.getCell('value').numFmt = NUM_FORMATS.currency;
    } else if (kpi.unit === '%') {
      row.getCell('value').numFmt = NUM_FORMATS.percent;
    } else if (kpi.unit === 'EUR/month') {
      row.getCell('value').numFmt = NUM_FORMATS.currency;
    }
  }

  // ---- One sheet per table ----
  for (const table of p.tables) {
    addTableSheet(wb, table);
  }

  // ---- Charts sheet (PNG, requires a headless-Chrome browser) ----
  if (browser && p.charts && p.charts.length) {
    await addChartsSheet(wb, p.charts, browser);
  }

  return wb;
}

async function addChartsSheet(wb: Workbook, charts: ReportChart[], browser: Browser) {
  const ws = wb.addWorksheet('Charts');
  ws.getColumn(1).width = 80;
  ws.getCell('A1').value = 'Charts';
  ws.getCell('A1').font = TITLE_FONT;
  ws.getRow(1).height = 24;
  let row = 2;
  for (const c of charts) {
    try {
      const png = await renderChartPng(browser, c);
      const title = ws.getCell(`A${row}`);
      title.value = c.title;
      title.font = { bold: true, size: 12, color: { argb: 'FF1D4E89' } };
      ws.getRow(row).height = 18;
      const imageId = wb.addImage({ buffer: png as unknown as any, extension: 'png' });
      ws.addImage(imageId, { tl: { col: 1, row: row - 1 }, ext: { width: 600 * 9525, height: 188 * 9525 } });
      row += 13;
    } catch (e) {
      // A chart image failure must never fail the whole workbook.
      console.error(`chart render failed (${c.key}):`, (e as Error)?.message || e);
      row += 2;
    }
  }
}

function addTableSheet(wb: Workbook, table: ReportTable) {
  const name = sanitizeSheetName(table.name);
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });

  ws.columns = table.columns.map((c: ReportColumn) => ({
    header: c.header,
    key: c.key,
    width: c.width || (c.type === 'text' ? 28 : 14),
    style: { border: BORDER },
  }));

  const header = ws.getRow(1);
  header.fill = HEADER_FILL;
  header.font = HEADER_FONT;
  header.height = 20;

  for (const r of table.rows || []) {
    const rowVals: Record<string, any> = {};
    for (const c of table.columns) {
      rowVals[c.key] = fmtValue(r[c.key], c.type || 'text');
    }
    const row = ws.addRow(rowVals);
    row.eachCell((cell) => { cell.border = BORDER; });
    ws.columns.forEach((col, i) => {
      const type = table.columns[i]?.type || 'text';
      const cell = row.getCell(col.key || i + 1);
      if (type === 'currency') cell.numFmt = NUM_FORMATS.currency;
      else if (type === 'percent') cell.numFmt = NUM_FORMATS.percent;
      else if (type === 'number') cell.numFmt = NUM_FORMATS.number;
      else if (type === 'date') cell.numFmt = NUM_FORMATS.date;
    });
  }

  if (table.rows && table.rows.length) {
    const last = ws.lastRow;
    if (last) {
      const totalRowNum = last.number + 1;
      const totalRow = ws.addRow({});
      ws.getCell(`A${totalRowNum}`).value = 'Total';
      ws.getCell(`A${totalRowNum}`).font = { bold: true };
      for (const c of table.columns) {
        if (c.type !== 'currency' && c.type !== 'number') continue;
        const sum = Number((table.rows as any[]).reduce((s: number, r: any) => s + (Number(r[c.key]) || 0), 0).toFixed(2));
        const cell = ws.getCell(`${columnLabel(c, ws) }${totalRowNum}`);
        cell.value = sum;
        cell.font = { bold: true };
        cell.numFmt = c.type === 'currency' ? NUM_FORMATS.currency : NUM_FORMATS.number;
        cell.border = BORDER;
      }
    }
  }
}

function columnLabel(c: ReportColumn, ws: any): string {
  const idx = (ws.columns || []).findIndex((col: any) => col.key === c.key);
  return idx >= 0 ? colLabel(idx + 1) : 'A';
}

function styleHeaderRow(row: any) {
  row.fill = HEADER_FILL;
  row.font = HEADER_FONT;
  row.height = 20;
  row.eachCell((cell: any) => { cell.border = BORDER; });
}

function colLabel(i: number): string {
  let n = i;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function fmtDate(d: any): string {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toISOString().slice(0, 10);
}

function sanitizeSheetName(name: string): string {
  const clean = String(name || 'Table').replace(/[\\/?*[\]:]/g, ' ').slice(0, 31);
  return clean || 'Table';
}