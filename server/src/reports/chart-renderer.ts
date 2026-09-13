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
      '<svg xmlns="http://www.w3.org/2000/svg" ',
      `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" `,
    );
    await page.setContent(
      `<html><body style="margin:0;padding:0;background:#ffffff">${svg}</body></html>`,
      { waitUntil: 'load' },
    );
    const shell = await page.$('svg');
    if (!shell) throw new Error('chart svg not found');
    const box = await shell.boundingBox();
    const png = await page.screenshot({
      clip: { x: 0, y: 0, width: box?.width || W, height: box?.height || H },
      encoding: 'binary',
    });
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