// ---------------------------------------------------------------------------
// PDF report renderer: produces the HTML that the puppeteer PdfService turns
// into an A4 PDF. Styling is intentionally print-friendly (inline CSS, no
// external assets) so the PDF is identical on any machine.
// ---------------------------------------------------------------------------

import { ReportPayload, ReportTable, ReportKpi, ReportChart } from './reports.catalog';
import { buildChartSvg } from './report-charts';
import { localizeText } from './reports-i18n';

function esc(v: any): string {
  if (v == null || v === '—') return '&mdash;';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtVal(v: any, type: string): string {
  if (v == null || v === '' || v === '—') return '&mdash;';
  if (type === 'currency') return `\u20AC ${numFmt(v, 2)}`;
  if (type === 'percent') return `${numFmt(v, 1)}%`;
  if (type === 'number') return numFmt(v, v % 1 !== 0 ? 2 : 0);
  if (type === 'date') return fmtDate(v);
  return esc(v);
}

function fmtDate(d: any): string {
  if (!d) return '&mdash;';
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return '&mdash;';
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${p2(dt.getDate())}/${p2(dt.getMonth() + 1)}/${dt.getFullYear()}`;
}

/** Date, time and (when known) the user who generated the file. */
function fmtStamp(d: any): string {
  const dt = d instanceof Date ? d : new Date(d || Date.now());
  if (isNaN(dt.getTime())) return '&mdash;';
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${p2(dt.getDate())}/${p2(dt.getMonth() + 1)}/${dt.getFullYear()} ${p2(dt.getHours())}:${p2(dt.getMinutes())}`;
}

function numFmt(n: any, decimals: number): string {
  const val = Number(n);
  if (isNaN(val)) return '0';
  return val.toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function kpiBlocks(kpis: ReportKpi[], locale?: string): string {
  if (!kpis.length) return '';
  const cells = kpis.map((k) => `
    <div class="kpi">
      <div class="kpi-label">${esc(k.label)}</div>
      <div class="kpi-value">${k.value == null ? '&mdash;' : esc(k.value)}<span class="kpi-unit">${esc(k.unit)}</span></div>
      ${k.trend != null ? `<div class="kpi-trend ${k.trend >= 0 ? 'up' : 'down'}">${k.trend > 0 ? '+' : ''}${numFmt(k.trend, 1)}${k.unit === '%' ? ' pp' : ''}</div>` : ''}
    </div>`).join('');
  return `<h2>${esc(localizeText('Key figures', locale))}</h2><div class="kpi-grid">${cells}</div>`;
}

function tableBlock(table: ReportTable): string {
  const head = table.columns.map((c) => `<th>${esc(c.header)}</th>`).join('');
  const body = (table.rows || []).map((r) => {
    const cells = table.columns.map((c) => `<td class="t-${c.type || 'text'}">${fmtVal(r[c.key], c.type || 'text')}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
  return `
    <div class="table-wrap">
      <h3>${esc(table.name)}</h3>
      <table>
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
}

function chartBlock(chart: ReportChart): string {
  const svg = buildChartSvg(chart);
  if (!svg) return '';
  return `
    <div class="chart-block">
      <h3>${esc(chart.title)}</h3>
      <div class="chart-box">${svg}</div>
    </div>`;
}

export function renderReportHtml(p: ReportPayload, locale?: string): string {
  const tables = (p.tables || []).map(tableBlock).join('');
  const charts = (p.charts || []).map(chartBlock).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(p.reportName)}</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111827; margin: 0; font-size: 11px; line-height: 1.45; }
  .page { max-width: 100%; }
  .pdf-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 10px; background: #ffffff; }
  .pdf-header img { height: 46px; max-width: 230px; object-fit: contain; }
  .brand-name { font-size: 20px; font-weight: 700; color: #111827; }
  .stamp { font-size: 9.5px; color: #6b7280; text-align: right; line-height: 1.55; }
  .title-row { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; border-top: 2px solid #ff5a00; padding-top: 10px; }
  h1 { font-size: 19px; margin: 0; color: #111827; letter-spacing: 0; }
  .meta { font-size: 10.5px; color: #6b7280; white-space: nowrap; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .3px; color: #ff5a00; margin: 18px 0 8px; border-bottom: 2px solid #ffd9c7; padding-bottom: 4px; }
  h3 { font-size: 12.5px; color: #111827; margin: 16px 0 8px; }
  h3::before { content: ''; display: inline-block; width: 3px; height: 11px; background: #ff5a00; margin-right: 6px; vertical-align: -1px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .kpi { background: #fff6f1; border: 1px solid #ffd9c7; border-radius: 6px; padding: 8px 10px; border-top: 3px solid #ff5a00; }
  .kpi-label { font-size: 10px; color: #8a3a12; text-transform: uppercase; letter-spacing: .3px; }
  .kpi-value { font-size: 17px; font-weight: 700; margin-top: 2px; }
  .kpi-unit { font-size: 10px; color: #8a3a12; font-weight: 400; margin-left: 4px; }
  .kpi-trend { font-size: 10px; font-weight: 600; }
  .kpi-trend.up { color: #059669; }
  .kpi-trend.down { color: #dc2626; }
  .table-wrap { margin-bottom: 12px; }
  .chart-block { margin: 14px 0 6px; page-break-inside: avoid; }
  .chart-box { border: 1px solid #ffd9c7; border-radius: 8px; padding: 8px; background: #fff; }
  .chart-box svg { width: 100%; height: auto; display: block; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #ffe9de; color: #111827; text-align: left; padding: 6px 8px; font-weight: 600; }
  td { padding: 5px 8px; border-bottom: 1px solid #ffd9c7; vertical-align: middle; text-align: left; }
  tr:nth-child(even) td { background: #fffaf7; }
  td.t-currency, td.t-number, td.t-percent { font-variant-numeric: tabular-nums; }
  td.t-date { white-space: nowrap; }
  .footer { margin-top: 24px; font-size: 10px; color: #9ca3af; }
</style>
</head>
<body>
  <div class="page">
    <header class="pdf-header">
      <div class="brand">
        ${p.companyLogo ? `<img src="${esc(p.companyLogo)}" alt="Logo" />` : `<span class="brand-name">HapCargo</span>`}
      </div>
      <div class="stamp">
        <div>${fmtStamp(p.generatedAt)}</div>
        ${p.generatedBy ? `<div>${esc(p.generatedBy)}</div>` : ''}
      </div>
    </header>
    <div class="title-row">
      <h1>${esc(p.reportName)}</h1>
      <div class="meta">${esc(localizeText('Period', locale))}: ${fmtDate(p.period.from)} &ndash; ${fmtDate(p.period.to)}</div>
    </div>
    ${kpiBlocks(p.kpis, locale)}
    ${charts}
    ${tables}
  </div>
</body>
</html>`;
}