// ---------------------------------------------------------------------------
// CHART PNG RENDERER
//
// Renders a chart's SVG into a hi-res, white-background PNG without any
// browser: it uses the `sharp` (libvips) rasteriser, which is available on
// every platform and does not depend on Chrome/puppeteer. Used to embed chart
// images into the Excel export. A puppeteer browser is accepted for backward
// compatibility but is no longer required.
//
// `sharp` is imported lazily so that a missing native dependency degrades to
// "no chart images" instead of crashing the whole reports module at boot.
// ---------------------------------------------------------------------------

import { createRequire } from 'module';
import { buildChartSvg } from './report-charts';
import { ReportChart } from './reports.catalog';

const W = 1200;
const H = Math.round((W * 300) / 960);

const sharpRequire = createRequire(__filename);
let sharpMod: any;

function getSharp(): any {
  if (sharpMod) return sharpMod;
  const mod: any = sharpRequire('sharp');
  sharpMod = mod?.default ?? mod;
  return sharpMod;
}

function withSize(svg: string, force = false): Buffer {
  if (!force && !svg.includes('width="')) {
    svg = svg.replace('<svg', `<svg width="${W}"`);
  }
  if (!svg.includes('height="')) {
    svg = svg.replace(/<svg([^>]*?)width="[0-9]+"/, `<svg$1width="${W}" height="${H}"`);
  }
  return Buffer.from(svg);
}

export async function renderChartPng(_browser: unknown, chart: ReportChart): Promise<Buffer> {
  const sharp = getSharp();
  const svg = buildChartSvg(chart);
  const first = withSize(svg);
  const png = await sharp(first, { density: 144 }).png().toBuffer();
  if (png && png.length > 0) return png;
  return await sharp(withSize(svg, true), { density: 144 }).png().toBuffer();
}

export async function imageSize(buffer: Buffer): Promise<{ width: number; height: number } | null> {
  try {
    const sharp = getSharp();
    const meta = await sharp(buffer).metadata();
    if (meta?.width && meta?.height) return { width: meta.width, height: meta.height };
  } catch {
    // sharp unavailable / unreadable buffer: callers fall back to a default box.
  }
  return null;
}

export async function renderChartsToPngs(_browser: unknown, charts: ReportChart[]): Promise<Buffer[]> {
  const out: Buffer[] = [];
  for (const c of charts) {
    out.push(await renderChartPng(_browser, c));
  }
  return out;
}