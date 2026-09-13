// ---------------------------------------------------------------------------
// CHART PNG RENDERER
//
// Renders a chart's SVG into a hi-res, white-background PNG using the shared
// headless-Chrome instance (no extra browser is spawned). Used to embed chart
// images into the Excel export.
// ---------------------------------------------------------------------------

import type { Browser } from 'puppeteer-core';
import { buildChartSvg } from './report-charts';
import { ReportChart } from './reports.catalog';

const W = 1200;
const H = Math.round((W * 300) / 960);

export async function renderChartPng(browser: Browser, chart: ReportChart): Promise<Buffer> {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: W, height: H });
    const svg = buildChartSvg(chart).replace(
      '<svg xmlns="http://www.w3.org/2000/svg"',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"`,
    );
    await page.setContent(
      `<html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{width:${W}px;height:${H}px;background:#ffffff}svg{display:block}</style></head><body>${svg}</body></html>`,
      { waitUntil: 'load' },
    );
    // Give the browser a beat to lay out + paint the SVG before screenshotting.
    await new Promise((r) => setTimeout(r, 150));
    const png = await page.screenshot({ encoding: 'binary', type: 'png' });
    if (!png || (typeof png === 'object' && png.length === 0)) throw new Error('empty chart screenshot');
    return Buffer.from(png as unknown as ArrayBuffer) as Buffer;
  } finally {
    await page.close();
  }
}

export async function renderChartsToPngs(browser: Browser, charts: ReportChart[]): Promise<Buffer[]> {
  const out: Buffer[] = [];
  for (const c of charts) {
    out.push(await renderChartPng(browser, c));
  }
  return out;
}