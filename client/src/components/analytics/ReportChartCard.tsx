import { useMemo } from 'react';

export interface ChartSeries {
  name: string;
  values: number[];
  color?: string;
}

export interface ChartSpec {
  key: string;
  title: string;
  kind: 'line' | 'bar';
  labels: string[];
  series: ChartSeries[];
}

const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#8b5cf6'];
const FONT = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

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

function lineSvg(c: ChartSpec): string {
  const W = 960, H = 300;
  const L = 56, R = 20, T = 16, B = 34;
  const pw = W - L - R, ph = H - T - B;
  const n = c.labels.length;
  if (n === 0) return '';
  const max = niceMax(Math.max(1, ...c.series.flatMap((s) => s.values)));
  const ticks = 4;
  const x = (i: number) => (n <= 1 ? L + pw / 2 : L + (i / (n - 1)) * pw);
  const y = (v: number) => T + ph - (v / max) * ph;
  const p = (v: number, i: number) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`;

  let g = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">`;
  g += `<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`;
  for (let t = 0; t <= ticks; t++) {
    const v = (max / ticks) * t;
    const yy = y(v);
    g += `<line x1="${L}" y1="${yy}" x2="${W - R}" y2="${yy}" stroke="#eef1f6" stroke-width="1"/>`;
    g += `<text x="${L - 8}" y="${yy + 4}" fill="#8a94a6" font-size="11" text-anchor="end">${formatNum(v)}</text>`;
  }
  const step = Math.max(1, Math.ceil(n / 10));
  for (let i = 0; i < n; i += step) {
    g += `<text x="${x(i)}" y="${H - 10}" fill="#8a94a6" font-size="11" text-anchor="middle">${esc(c.labels[i])}</text>`;
  }
  c.series.forEach((s, si) => {
    const color = s.color || PALETTE[si % PALETTE.length];
    const pts = s.values.map((v, i) => p(v, i)).join(' ');
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
    g += `<text x="${legendX + 16}" y="${T + 13}" fill="#39415c" font-size="12" font-weight="600">${esc(s.name)}</text>`;
    legendX += 26 + s.name.length * 7.1;
  });
  g += '</svg>';
  return g;
}

function barSvg(c: ChartSpec): string {
  const W = 960, H = 300;
  const L = 240, R = 64, T = 26, B = 22;
  const pw = W - L - R;
  const values = c.series[0]?.values || [];
  const bars = Math.min(values.length, 12);
  if (bars === 0) return '';
  const rowH = (H - T - B) / bars;
  const barH = Math.max(6, rowH - 8);

  let g = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">`;
  g += `<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`;
  for (const t of [0, 25, 50, 75, 100]) {
    const xx = L + (t / 100) * pw;
    g += `<line x1="${xx}" y1="${T}" x2="${xx}" y2="${H - B}" stroke="#eef1f6" stroke-width="1"/>`;
    g += `<text x="${xx}" y="${H - B + 14}" fill="#8a94a6" font-size="10" text-anchor="middle">${t}%</text>`;
  }
  const tx = L + 0.85 * pw;
  g += `<line x1="${tx}" y1="${T}" x2="${tx}" y2="${H - B}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="5,4"/>`;
  g += `<text x="${tx}" y="${T + 10}" fill="#94a3b8" font-size="10" text-anchor="middle">Target 85%</text>`;
  c.labels.slice(0, bars).forEach((label, i) => {
    const v = Math.max(0, values[i] || 0);
    const color = v >= 90 ? '#10b981' : v >= 70 ? '#f59e0b' : '#ef4444';
    const yy = T + i * rowH;
    const bw = (Math.min(v, 100) / 100) * pw;
    const lname = label.length > 26 ? `${label.slice(0, 25)}…` : label;
    g += `<text x="${L - 10}" y="${yy + barH / 2 + 4}" fill="#39415c" font-size="12" text-anchor="end">${esc(lname)}</text>`;
    g += `<rect x="${L}" y="${yy + (rowH - barH) / 2}" width="${bw.toFixed(1)}" height="${barH}" rx="${Math.min(6, barH / 2)}" fill="${color}"/>`;
    g += `<text x="${L + bw + 8}" y="${yy + barH / 2 + 4}" fill="${color}" font-size="11" font-weight="700">${Math.round(v)}%</text>`;
  });
  g += '</svg>';
  return g;
}

export default function ReportChartCard({ chart }: { chart: ChartSpec }) {
  const svg = useMemo(() => (chart.kind === 'bar' ? barSvg(chart) : lineSvg(chart)), [chart]);
  return (
    <div className="card !p-5">
      <h3 className="text-sm font-bold text-text mb-3 flex items-center gap-2">
        <ChartIcon className="w-4 h-4 text-primary" /> {chart.title}
      </h3>
      <div
        className="overflow-hidden rounded-xl border border-border/70"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  );
}