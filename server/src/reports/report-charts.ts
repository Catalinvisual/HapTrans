// ---------------------------------------------------------------------------
// CHART RENDERING (SVG)
//
// Builds modern, self-contained inline SVG charts for report payloads. The SVG
// is embedded directly in PDFs, rendered to a hi-res PNG for Excel, and reused
// verbatim by the client on-screen preview so every surface looks identical.
//
// Supported kinds:
//   - line  : time-series trend with multiple series
//   - bar   : horizontal bars, auto-scaled (percent when all values are 0..100,
//             absolute currency/count otherwise); supports 1-2 series
//   - donut : single-series share / distribution
// ---------------------------------------------------------------------------

import { ReportChart } from './reports.catalog';

const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#8b5cf6'];
const FONT = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const AXIS = '#8a94a6';
const GRID = '#eef1f6';
const TEXT = '#39415c';

function esc(s: any): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const d = v / pow;
  const n = d <= 1 ? 1 : d <= 2 ? 2 : d <= 5 ? 5 : 10;
  return n * pow;
}

function formatNum(v: number): string {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return `${Math.round(v)}`;
}

function lineChartSvg(c: ReportChart): string {
  const W = 960, H = 300;
  const L = 56, R = 20, T = 16, B = 34;
  const pw = W - L - R, ph = H - T - B;
  const n = c.labels.length;
  if (n === 0) return '';
  const max = niceMax(Math.max(1, ...c.series.flatMap((s) => s.values)));
  const ticks = 4;
  const x = (i: number) => (n <= 1 ? L + pw / 2 : L + (i / (n - 1)) * pw);
  const y = (v: number) => T + ph - (v / max) * ph;

  let g = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">`;
  g += `<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`;

  for (let t = 0; t <= ticks; t++) {
    const v = (max / ticks) * t;
    const yy = y(v);
    g += `<line x1="${L}" y1="${yy}" x2="${W - R}" y2="${yy}" stroke="${GRID}" stroke-width="1"/>`;
    g += `<text x="${L - 8}" y="${yy + 4}" fill="${AXIS}" font-size="11" text-anchor="end">${formatNum(v)}</text>`;
  }
  const step = Math.max(1, Math.ceil(n / 10));
  for (let i = 0; i < n; i += step) {
    g += `<text x="${x(i)}" y="${H - 10}" fill="${AXIS}" font-size="11" text-anchor="middle">${esc(c.labels[i])}</text>`;
  }

  c.series.forEach((s, si) => {
    const color = s.color || PALETTE[si % PALETTE.length];
    const pts = s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    g += `<polygon points="${`${L},${T + ph}`} ${pts} ${`${x(n - 1).toFixed(1)},${T + ph}`}" fill="${color}" opacity="0.08"/>`;
    g += `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    const from = Math.max(0, n - 12);
    for (let i = from; i < n; i++) {
      g += `<circle cx="${x(i).toFixed(1)}" cy="${y(s.values[i]).toFixed(1)}" r="2.8" fill="#ffffff" stroke="${color}" stroke-width="2"/>`;
    }
  });

  let legendX = L + 8;
  c.series.forEach((s, si) => {
    const color = s.color || PALETTE[si % PALETTE.length];
    g += `<rect x="${legendX}" y="${T + 4}" width="10" height="10" rx="3" fill="${color}"/>`;
    g += `<text x="${legendX + 16}" y="${T + 13}" fill="${TEXT}" font-size="12" font-weight="600">${esc(s.name)}</text>`;
    legendX += 26 + s.name.length * 7.1;
  });

  g += '</svg>';
  return g;
}

function barChartSvg(c: ReportChart): string {
  const W = 960, H = 320;
  const L = 250, R = 84, T = 46, B = 26;
  const pw = W - L - R;
  const series = c.series || [];
  const labels = c.labels || [];
  const bars = Math.min(labels.length, 10);
  if (bars === 0 || series.length === 0) return '';

  const all = series.flatMap((s) => s.values).filter((v) => v != null);
  const isPct = all.length > 0 && all.every((v) => v >= 0 && v <= 100);
  const max = isPct ? 100 : niceMax(Math.max(1, ...all));

  const rowH = (H - T - B) / bars;
  const nSer = series.length;
  const groupH = Math.max(8, rowH - 12);
  const gap = nSer > 1 ? 5 : 0;
  const barH = nSer > 1 ? Math.max(5, (groupH - gap * (nSer - 1)) / nSer) : groupH;
  const fmt = (v: number) => (isPct ? `${Math.round(v)}%` : formatNum(v));

  let g = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">`;
  g += `<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`;

  const ticks = isPct ? [0, 25, 50, 75, 100] : [0, 0.25, 0.5, 0.75, 1].map((t) => max * t);
  for (const t of ticks) {
    const xx = L + (t / max) * pw;
    g += `<line x1="${xx}" y1="${T - 28}" x2="${xx}" y2="${H - B}" stroke="${GRID}" stroke-width="1"/>`;
    g += `<text x="${xx}" y="${H - B + 16}" fill="${AXIS}" font-size="10" text-anchor="middle">${isPct ? `${Math.round(t)}%` : formatNum(t)}</text>`;
  }

  if (nSer > 1) {
    let lx = L;
    series.forEach((s, si) => {
      const color = s.color || PALETTE[si % PALETTE.length];
      g += `<rect x="${lx}" y="${T - 30}" width="10" height="10" rx="3" fill="${color}"/>`;
      g += `<text x="${lx + 16}" y="${T - 21}" fill="${TEXT}" font-size="12" font-weight="600">${esc(s.name)}</text>`;
      lx += 26 + s.name.length * 7.1;
    });
  }

  for (let i = 0; i < bars; i++) {
    const yy = T + i * rowH;
    const lname = labels[i].length > 30 ? `${labels[i].slice(0, 29)}…` : labels[i];
    g += `<text x="${L - 10}" y="${yy + groupH / 2 + 4}" fill="${TEXT}" font-size="12.5" font-weight="600" text-anchor="end">${esc(lname)}</text>`;
    series.forEach((s, si) => {
      const color = s.color || PALETTE[si % PALETTE.length];
      const val = Math.max(0, s.values[i] || 0);
      const bw = (val / max) * pw;
      const by = yy + (rowH - groupH) / 2 + si * (barH + gap);
      g += `<rect x="${L}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${barH.toFixed(1)}" rx="${Math.min(6, barH / 2).toFixed(1)}" fill="${color}" opacity="${nSer > 1 ? 0.92 : 1}"/>`;
      g += `<text x="${(L + bw + 7).toFixed(1)}" y="${(by + barH / 2 + 4).toFixed(1)}" fill="${color}" font-size="11.5" font-weight="700">${fmt(val)}</text>`;
    });
  }

  g += '</svg>';
  return g;
}

function donutChartSvg(c: ReportChart): string {
  const W = 960, H = 320;
  const values = (c.series[0]?.values || []).map((v) => Math.max(0, v));
  const labels = c.labels || [];
  const data = labels.map((l, i) => ({ label: l, value: values[i] || 0, color: undefined as string | undefined }))
    .filter((d) => d.value > 0)
    .slice(0, 10);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total <= 0 || data.length === 0) return '';

  const cx = 205, cy = H / 2, r = 92, th = 40;
  const C = 2 * Math.PI * r;

  let g = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">`;
  g += `<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`;

  let offset = 0;
  data.forEach((d, i) => {
    const color = d.color || PALETTE[i % PALETTE.length];
    const len = C * (d.value / total);
    g += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${th}" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>`;
    offset += len;
  });

  g += `<text x="${cx}" y="${cy - 4}" fill="${TEXT}" font-size="26" font-weight="700" text-anchor="middle">${formatNum(total)}</text>`;
  g += `<text x="${cx}" y="${cy + 18}" fill="${AXIS}" font-size="12" text-anchor="middle">Total</text>`;

  let ly = 42;
  data.forEach((d, i) => {
    const color = d.color || PALETTE[i % PALETTE.length];
    const lname = d.label.length > 30 ? `${d.label.slice(0, 29)}…` : d.label;
    g += `<rect x="372" y="${ly}" width="12" height="12" rx="3" fill="${color}"/>`;
    g += `<text x="392" y="${ly + 11}" fill="${TEXT}" font-size="12.5" font-weight="600">${esc(lname)}</text>`;
    g += `<text x="700" y="${ly + 11}" fill="${TEXT}" font-size="12.5" font-weight="700" text-anchor="end">${formatNum(d.value)}</text>`;
    g += `<text x="712" y="${ly + 11}" fill="${AXIS}" font-size="12" text-anchor="start">${((d.value / total) * 100).toFixed(1)}%</text>`;
    ly += 27;
  });

  g += '</svg>';
  return g;
}

export function buildChartSvg(c: ReportChart): string {
  if (c.kind === 'bar') return barChartSvg(c);
  if (c.kind === 'donut') return donutChartSvg(c);
  return lineChartSvg(c);
}