import { renderChartPng } from './chart-renderer';
import { buildChartSvg } from './report-charts';
import { buildReportWorkbook } from './excel-export';

describe('chart-renderer (sharp-based PNG rendering, no browser required)', () => {
  it('renders a line chart SVG to a valid non-empty PNG buffer', async () => {
    const chart: any = {
      key: 'ordersTrend',
      title: 'Orders vs Delivered vs On-time (trend)',
      kind: 'line',
      labels: ['2026-08-15', '2026-08-18', '2026-08-21', '2026-08-24', '2026-08-27', '2026-08-30', '2026-09-02', '2026-09-05', '2026-09-08', '2026-09-11'],
      series: [
        { name: 'Orders', values: [5, 4, 6, 3, 7, 8, 5, 6, 7, 4], color: '#ff6d00' },
        { name: 'Delivered', values: [3, 2, 4, 2, 5, 6, 4, 5, 6, 3], color: '#00c853' },
        { name: 'On-time', values: [2, 2, 3, 2, 4, 5, 3, 4, 5, 3], color: '#ffd000' },
        { name: 'Late', values: [1, 0, 1, 0, 1, 1, 1, 1, 1, 0], color: '#ff1744' },
      ],
    };

    const png = await renderChartPng(undefined, chart);

    expect(Buffer.isBuffer(png)).toBe(true);
    expect(png.length).toBeGreaterThan(1000);
    // PNG magic header
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  });

  it('embeds client-supplied chart PNGs into the Excel Charts sheet', async () => {
    const PNG1X1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC';
    const payload: any = {
      reportKey: 'executive_overview',
      reportName: 'Executive Overview',
      description: 'test',
      generatedAt: new Date(),
      period: { from: new Date('2026-01-01'), to: new Date('2026-02-01') },
      kpis: [{ key: 'orders', label: 'Orders', value: 10, unit: 'count' }],
      tables: [],
      charts: [
        { key: 'ordersTrend', title: 'Trend', kind: 'line', labels: ['a'], series: [{ name: 'Orders', values: [1] }] },
      ],
      chartPngs: [{ key: 'ordersTrend', dataUrl: PNG1X1 }],
    };

    const wb = await buildReportWorkbook(payload, undefined, 'en');
    const chartsSheet = wb.worksheets.find((s: any) => s.name === 'Charts');
    expect(chartsSheet).toBeDefined();
    expect(chartsSheet!.getImages().length).toBe(1);
  });

  it('paints the trend lines with the vivid orange/green/yellow/red palette', () => {
    const chart: any = {
      key: 'ordersTrend',
      title: 'Orders vs Delivered vs On-time (trend)',
      kind: 'line',
      labels: ['a', 'b', 'c'],
      series: [
        { name: 'Orders', values: [1, 2, 3], color: '#ff6d00' },
        { name: 'Delivered', values: [2, 3, 4], color: '#00c853' },
        { name: 'On-time', values: [3, 4, 5], color: '#ffd000' },
        { name: 'Late', values: [0, 1, 0], color: '#ff1744' },
      ],
    } as any;
    const svg = buildChartSvg(chart);
    for (const c of ['#ff6d00', '#00c853', '#ffd000', '#ff1744']) {
      expect(svg).toContain(c);
    }
  });

  it('renders a bar chart and a donut chart without a browser', async () => {
    const bar: any = {
      key: 'clientOtif',
      title: 'On-time delivery rate by customer (%)',
      kind: 'bar',
      labels: ['A', 'B', 'C'],
      series: [
        { name: 'On-time %', values: [90, 80, 70], color: '#00c853' },
        { name: 'Late %', values: [10, 20, 30], color: '#ff1744' },
      ],
    };
    const donut: any = {
      key: 'donut',
      title: 'Status',
      kind: 'donut',
      labels: ['A', 'B', 'C'],
      series: [{ name: 'Orders', values: [10, 20, 30] }],
    };

    const [barPng, donutPng] = await Promise.all([renderChartPng(undefined, bar), renderChartPng(undefined, donut)]);
    expect(barPng.subarray(12, 16).toString('binary')).toBe('IHDR');
    expect(donutPng.length).toBeGreaterThan(1000);
  });
});