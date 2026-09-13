// ---------------------------------------------------------------------------
// CHART PNG RENDERER
//
// Renders a chart's SVG into a hi-res, white-background PNG without any
// browser: it uses the `sharp` (libvips) rasteriser, which is available on
// every platform and does not depend on Chrome/puppeteer. Used to embed chart
// images into the Excel export. A puppeteer browser is accepted for backward
// compatibility but is no longer required.
// ---------------------------------------------------------------------------

import sharp from 'sharp';
import { buildChartSvg } from './report-charts';
import { ReportChart } from './reports.catalog';

const W = 1200;
const H = Math.round((W * 300) / 960);

function chartSvg(chart: ReportChart): Buffer {
  let svg = buildChartSvg(chart);
  // Force an explicit canvas so sharp bakes the graph at a predictable size.
  if (!svg.includes('width="')) {
    svg = svg.replace('<svg', `<svg width="${W}"`);
  }
  if (!svg.includes('height="')) {
    svg = svg.replace(/<svg width="[0-9]+"/, `<svg width="${W}" height="${H}"`);
  }
  return Buffer.from(svg);
}

export async function renderChartPng(_browser: unknown, chart: ReportChart): Promise<Buffer> {
  try {
    return await sharp(chartSvg(chart), { density: 144 }).png().toBuffer();
  } catch (e) {
    // Fallback: render at 1x with an explicit size, in case the SVG lacked
    // intrinsic dimensions that confused the first pass.
    const svg = buildChartSvg(chart);
    const forced = svg.replace(
      '<svg',
      `<svg width="${W}" height="${H}"`,
    );
    return await sharp(Buffer.from(forced), { density: 144 }).png().toBuffer();
  }
}

export async function renderChartsToPngs(_browser: unknown, charts: ReportChart[]): Promise<Buffer[]> {
  const out: Buffer[] = [];
  for (const c of charts) {
    out.push(await renderChartPng(_browser, c));
  }
  return out;
}