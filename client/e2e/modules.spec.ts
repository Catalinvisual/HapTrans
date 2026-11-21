import { test, expect } from '@playwright/test';
import { mockApi, seedSession } from './support/mocks';

const MODULES = [
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/orders', name: 'Comenzi' },
  { path: '/trips', name: 'Curse' },
  { path: '/planning', name: 'Planificare' },
  { path: '/drivers', name: 'Șoferi' },
  { path: '/clients', name: 'Clienți' },
  { path: '/fleet', name: 'Flotă' },
  { path: '/documents', name: 'Documente' },
  { path: '/invoices', name: 'Facturi' },
  { path: '/financial', name: 'Financiar' },
  { path: '/reports', name: 'Rapoarte' },
  { path: '/payroll', name: 'Salarizare' },
  { path: '/maintenance', name: 'Mentenanță' },
  { path: '/expenses', name: 'Cheltuieli' },
  { path: '/users', name: 'Utilizatori' },
  { path: '/settings', name: 'Setări' },
  { path: '/chat', name: 'Chat' },
  { path: '/telematics', name: 'Telematică' },
  { path: '/tachograph', name: 'Tahograf' },
];

// The dashboard reads one aggregate object; empty lists are enough for a smoke
// test, but `meta` is dereferenced directly, so it must exist.
const DASHBOARD_OVERVIEW = {
  meta: { chartScope: 'range', granularity: 'day', generatedAt: '2026-11-20T10:00:00.000Z' },
  kpis: {},
  trends: {},
  series: [],
  weekSeries: [],
  today: {
    counts: { departures: 0, arrivals: 0, active: 0, delayed: 0 },
    departures: [],
    arrivals: [],
    active: [],
    delayed: [],
  },
  upcoming: { trips: [], days: [] },
  delayedTrips: [],
  unassignedOrders: [],
  filterOptions: { trucks: [], drivers: [], clients: [], countries: [] },
  byCountry: [],
  alerts: [],
  statusDistribution: [],
  fleet: [],
  drivers: [],
  topRoutes: [],
  heatmap: [],
  driverHours: [],
  telemetry: { total: 0, online: 0, offline: 0, noDevice: 0, stale: [] },
};

test.beforeEach(async ({ page }) => {
  await seedSession(page);
  await mockApi(page, [
    { match: /^\/dashboard\/overview$/, body: DASHBOARD_OVERVIEW },
    { match: /^\/dashboard\/filter-options$/, body: { trucks: [], drivers: [], clients: [], countries: [] } },
  ]);
});

for (const module of MODULES) {
  test(`${module.name} se încarcă fără erori de runtime`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', async (message) => {
      const text = message.text();
      // The blocked websocket and its retries are expected in an offline run.
      if (message.type() !== 'error' || text.includes('net::ERR_FAILED')) return;
      const args = await Promise.all(
        message.args().map((arg) =>
          arg
            .evaluate((value) =>
              value instanceof Error ? value.stack || value.message : typeof value === 'string' ? value : String(value),
            )
            .catch(() => ''),
        ),
      );
      errors.push([text, ...args].filter(Boolean).join(' | '));
    });

    await page.goto(module.path);

    await expect(page).toHaveURL(new RegExp(`${module.path.replace('/', '\\/')}`));
    expect(errors, `Uncaught errors on ${module.path}: ${errors.join(' | ')}`).toEqual([]);
    await expect(page.locator('main')).toBeVisible();
  });
}
