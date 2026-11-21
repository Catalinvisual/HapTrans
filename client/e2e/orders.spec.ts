import { test, expect } from '@playwright/test';
import { mockApi, seedSession } from './support/mocks';

const ORDERS = [
  {
    id: 'order-1',
    orderNumber: 'ORD-001',
    referenceNumber: 'REF-ALPHA',
    status: 'PLANNING',
    client: { id: 'client-1', name: 'Alpha Logistics SRL' },
    transportType: 'ftl',
    totalPrice: 1500,
    priceCurrency: 'EUR',
    createdAt: '2026-11-19T10:00:00.000Z',
    cargoItems: [{ id: 'c1', weightKg: 12000, ldm: 6 }],
    stops: [
      { id: 's1', type: 'pickup', sequence: 1, city: 'București', country: 'RO', dateFrom: '2026-11-20T08:00:00.000Z' },
      { id: 's2', type: 'dropoff', sequence: 2, city: 'München', country: 'DE' },
    ],
  },
  {
    id: 'order-2',
    orderNumber: 'ORD-002',
    referenceNumber: 'REF-BETA',
    status: 'COMPLETED',
    client: { id: 'client-2', name: 'Beta Trans SRL' },
    transportType: 'groupage',
    totalPrice: 800,
    priceCurrency: 'EUR',
    createdAt: '2026-11-18T10:00:00.000Z',
    cargoItems: [],
    stops: [
      { id: 's3', type: 'pickup', sequence: 1, city: 'Cluj-Napoca', country: 'RO' },
      { id: 's4', type: 'dropoff', sequence: 2, city: 'Wien', country: 'AT' },
    ],
  },
];

test.beforeEach(async ({ page }) => {
  await seedSession(page);
  await mockApi(page, [{ match: /^\/orders(\?.*)?$/, body: ORDERS }]);
});

test('lista afișează comenzile primite de la API', async ({ page }) => {
  await page.goto('/orders');
  await expect(page.getByText('ORD-001')).toBeVisible();
  await expect(page.getByText('ORD-002')).toBeVisible();
  await expect(page.getByText('Alpha Logistics SRL')).toBeVisible();
});

test('căutarea filtrează comenzile după referință sau client', async ({ page }) => {
  await page.goto('/orders');
  const search = page.locator('input[placeholder*="referință"]');
  await expect(search).toBeVisible();

  await search.fill('Beta');

  await expect(page.getByText('ORD-002')).toBeVisible();
  await expect(page.getByText('ORD-001')).toBeHidden();
});

test('ștergerea cere confirmare înainte de a trimite ceva', async ({ page }) => {
  await page.goto('/orders');
  await expect(page.getByText('ORD-001')).toBeVisible();

  await page.locator('button[title="Șterge"]').first().click();

  await expect(page.getByRole('heading', { name: 'Confirmă ștergerea' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Anulează' })).toBeVisible();
});

test('butonul Creează comandă deschide wizard-ul', async ({ page }) => {
  await page.goto('/orders');
  await page.getByRole('button', { name: 'Creează comandă', exact: true }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Creează comandă nouă' })).toBeVisible();
});
