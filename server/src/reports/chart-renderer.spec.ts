import { renderChartPng } from './chart-renderer';

describe('chart-renderer (sharp-based PNG rendering, no browser required)', () => {
  it('renders a line chart SVG to a valid non-empty PNG buffer', async () => {
    const chart: any = {
      key: 'ordersTrend',
      title: 'Orders vs Delivered vs On-time (trend)',
      kind: 'line',
      labels: ['2026-08-15', '2026-08-18', '2026-08-21', '2026-08-24', '2026-08-27', '2026-08-30', '2026-09-02', '2026-09-05', '2026-09-08', '2026-09-11'],
      series: [
        { name: 'Orders', values: [5, 4, 6, 3, 7, 8, 5, 6, 7, 4], color: '#f97316' },
        { name: 'Delivered', values: [3, 2, 4, 2, 5, 6, 4, 5, 6, 3], color: '#10b981' },
        { name: 'On-time', values: [2, 2, 3, 2, 4, 5, 3, 4, 5, 3], color: '#f59e0b' },
        { name: 'Late', values: [1, 0, 1, 0, 1, 1, 1, 1, 1, 0], color: '#ef4444' },
      ],
    };

    const png = await renderChartPng(undefined, chart);

    expect(Buffer.isBuffer(png)).toBe(true);
    expect(png.length).toBeGreaterThan(1000);
    // PNG magic header
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  });

  it('renders a bar chart and a donut chart without a browser', async () => {
    const bar: any = {
      key: 'clientOtif',
      title: 'On-time delivery rate by customer (%)',
      kind: 'bar',
      labels: ['A', 'B', 'C'],
      series: [
        { name: 'On-time %', values: [90, 80, 70], color: '#10b981' },
        { name: 'Late %', values: [10, 20, 30], color: '#ef4444' },
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