import { test, expect, type Request } from '@playwright/test';
import { mockApi, seedSession } from './support/mocks';

const ORDER = {
  id: 'order-1',
  orderNumber: 'ORD-001',
  internalReference: 'REF-ALPHA',
  clientId: 'client-1',
  client: { id: 'client-1', name: 'Alpha Logistics SRL' },
  priority: 'high',
  transportType: 'ftl',
  price: 1500,
  currency: 'EUR',
  notes: 'Test order',
  equipmentRequirements: [],
  stops: [
    {
      id: 's1',
      type: 'pickup',
      sequence: 1,
      companyName: 'Depozit Alpha',
      address: 'Hauptstraße 1, 10115 Berlin',
      city: 'Berlin',
      country: 'DE',
      postalCode: '10115',
      dateFrom: '2026-11-25',
      timeFrom: '08:00',
      latitude: 52.5321,
      longitude: 13.3849,
      contactPerson: 'Hans',
      phone: '+4930123',
    },
    {
      id: 's2',
      type: 'dropoff',
      sequence: 2,
      companyName: 'Beta Dock',
      address: 'Via Roma 10, 20121 Milano',
      city: 'Milano',
      country: 'IT',
      postalCode: '20121',
      dateFrom: '2026-11-26',
      timeFrom: '10:00',
      latitude: 45.4642,
      longitude: 9.19,
    },
  ],
  cargoItems: [
    { id: 'c1', description: 'Industrial parts', quantity: 10, weightKg: 12000, ldm: 6, unit: 'pallet' },
  ],
  trip: null,
};

test.beforeEach(async ({ page }) => {
  await seedSession(page);
  await mockApi(page, [
    { match: /^\/orders$/, method: 'GET', body: [ORDER] },
    { match: /^\/orders\/order-1$/, method: 'GET', body: ORDER },
    { match: /^\/orders\/order-1$/, method: 'PATCH', body: { ...ORDER, notes: 'Test order' } },
    { match: /^\/clients$/, body: [{ id: 'client-1', name: 'Alpha Logistics SRL' }] },
  ]);
});

test('o comandă existentă se poate parcurge și salva', async ({ page }) => {
  const patches: Request[] = [];
  page.on('request', (request) => {
    if (request.method() === 'PATCH') patches.push(request);
  });

  await page.goto('/orders');
  await page.locator('button[title="Modifică"]').first().click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Editează comanda' })).toBeVisible();
  // Wait for the order to load into the form before stepping through it.
  await expect(dialog.locator('#wiz-client')).toContainText('Alpha Logistics SRL');

  await dialog.getByRole('button', { name: 'Pasul următor' }).click();
  await expect(dialog.getByText(/Pas\s*2 of 3/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Pasul următor' }).click();
  await expect(dialog.getByText(/Pas\s*3 of 3/)).toBeVisible();

  await dialog.getByRole('button', { name: 'Confirmă și salvează' }).click();

  await expect(page.getByText('Salvat')).toBeVisible();
  expect(patches).toHaveLength(1);
  const payload = patches[0].postDataJSON() as any;
  expect(payload.clientId).toBe('client-1');
  expect(payload.stops).toHaveLength(2);
  expect(payload.stops[0]).toMatchObject({ type: 'pickup', city: 'Berlin', scheduledDate: '2026-11-25' });
  expect(payload.stops[1]).toMatchObject({ type: 'dropoff', city: 'Milano' });
  expect(payload.cargoItems[0].description).toBe('Industrial parts');
  // After saving, the order detail drawer can open behind the wizard.
  await expect(page.getByRole('heading', { name: 'Editează comanda' })).toBeHidden();
});
