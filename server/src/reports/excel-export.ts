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
import { localizeText } from './reports-i18n';
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

export async function buildReportWorkbook(p: ReportPayload, browser?: Browser, locale?: string): Promise<Workbook> {
  const wb = new Workbook();
  const T = (s: string) => localizeText(s, locale);

  const kpiSheet = wb.addWorksheet('Summary', { views: [{ state: 'frozen', ySplit: 5 }] });

  if (p.companyLogo) {
    try {
      let buffer: Buffer | undefined;
      let ext = 'png';
      if (p.companyLogo.startsWith('data:image/')) {
        const parts = p.companyLogo.split(';base64,');
        if (parts.length === 2) {
          buffer = Buffer.from(parts[1], 'base64');
          if (parts[0].includes('jpeg') || parts[0].includes('jpg')) ext = 'jpeg';
        }
      } else {
        const res = await fetch(p.companyLogo.startsWith('http') ? p.companyLogo : `http://localhost:${process.env.PORT || 4000}${p.companyLogo}`);
        if (res.ok) {
          const arr = await res.arrayBuffer();
          buffer = Buffer.from(arr);
          if (p.companyLogo.toLowerCase().includes('jpg') || p.companyLogo.toLowerCase().includes('jpeg')) ext = 'jpeg';
        }
      }
      if (buffer) {
        const imageId = wb.addImage({ buffer: buffer as any, extension: ext as any });
        kpiSheet.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 128 * 9525, height: 36 * 9525 } });
        kpiSheet.getRow(1).height = 40;
      } else {
        kpiSheet.getRow(1).height = 12;
      }
    } catch (e) { console.error('Failed to embed logo in Excel:', e); }
  }

  kpiSheet.mergeCells('A2:D2');
  const titleCell = kpiSheet.getCell('A2');
  titleCell.value = p.reportName;
  titleCell.font = TITLE_FONT;
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  kpiSheet.getRow(2).height = 40;

  kpiSheet.mergeCells('A3:D3');
  const metaCell = kpiSheet.getCell('A3');
  metaCell.value =
    `${T('Period')}: ${fmtDate(p.period.from)} – ${fmtDate(p.period.to)}   |   ${T('Generated')}: ${fmtDate(p.generatedAt)}`;
  metaCell.font = META_FONT;
  metaCell.alignment = { vertical: 'middle', horizontal: 'center' };
  kpiSheet.getRow(3).height = 18;

  kpiSheet.getRow(4).height = 12;

  kpiSheet.columns = [
    { key: 'label', width: 30 },
    { key: 'value', width: 16 },
    { key: 'unit', width: 12 },
    { key: 'trend', width: 14 },
  ];
  
  const headerRow = kpiSheet.getRow(5);
  headerRow.values = [T('KPI'), T('Value'), T('Unit'), T('Trend')];
  styleHeaderRow(headerRow);

  for (const kpi of p.kpis) {
    const row = kpiSheet.addRow({
      label: kpi.label,
      value: kpi.value,
      unit: kpi.unit,
      trend: kpi.trend == null ? '' : `${kpi.trend > 0 ? '+' : ''}${kpi.trend}${kpi.unit === '%' ? 'pp' : ''}`,
    });
    row.eachCell((cell) => {
      cell.border = BORDER;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    const isCurr = /EUR|€/.test(String(kpi.unit));
    if (isCurr) {
      row.getCell('value').numFmt = NUM_FORMATS.currency;
    } else if (kpi.unit === '%') {
      row.getCell('value').numFmt = NUM_FORMATS.percent;
    }
  }

  // ---- One sheet per table ----
  for (const table of p.tables) {
    addTableSheet(wb, table, locale);
  }

  // ---- Charts sheet (PNG, requires a headless-Chrome browser) ----
  if (browser && p.charts && p.charts.length) {
    await addChartsSheet(wb, p.charts, browser, locale);
  }

  return wb;
}

async function addChartsSheet(wb: Workbook, charts: ReportChart[], browser: Browser, locale?: string) {
  const ws = wb.addWorksheet('Charts');
  const chartsTitle = localizeText('Charts', locale);
  ws.getColumn(1).width = 80;
  ws.getCell('A1').value = chartsTitle;
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

function addTableSheet(wb: Workbook, table: ReportTable, locale?: string) {
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
  header.height = 22;
  header.eachCell((cell, col) => {
    cell.border = BORDER;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  for (const r of table.rows || []) {
    const rowVals: Record<string, any> = {};
    for (const c of table.columns) {
      rowVals[c.key] = fmtValue(r[c.key], c.type || 'text');
    }
    const row = ws.addRow(rowVals);
    row.eachCell((cell, col) => {
      cell.border = BORDER;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
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
      ws.getCell(`A${totalRowNum}`).value = localizeText('Total', locale);
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
  row.height = 22;
  row.eachCell((cell: any) => {
    cell.border = BORDER;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
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