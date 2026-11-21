import { test, expect, type Request } from '@playwright/test';
import { mockApi, seedSession } from './support/mocks';

const BERLIN = { lat: 52.5321, lng: 13.3849, city: 'Berlin', countryCode: 'DE', postalCode: '10115' };
const MILANO = { lat: 45.4642, lng: 9.19, city: 'Milano', countryCode: 'IT', postalCode: '20121' };

test.beforeEach(async ({ page }) => {
  await seedSession(page);
  await mockApi(page, [
    { match: /^\/clients$/, body: [{ id: 'client-1', name: 'Alpha Logistics SRL' }] },
    {
      match: /^\/routing\/autocomplete$/,
      body: (url: URL) => {
        const query = url.searchParams.get('q') || '';
        return [
          {
            id: query.toLowerCase().includes('via') ? 'addr-2' : 'addr-1',
            label: query.toLowerCase().includes('via')
              ? 'Via Roma 10, 20121 Milano'
              : 'Hauptstraße 1, 10115 Berlin',
          },
        ];
      },
    },
    {
      match: /^\/routing\/geocode$/,
      body: (url: URL) =>
        (url.searchParams.get('address') || '').toLowerCase().includes('via') ? MILANO : BERLIN,
    },
    { match: /^\/routing\/diesel-prices$/, body: [{ country: 'NL', price: 1.55 }] },
    { match: /^\/orders\/next-reference$/, body: { nextReference: 'ORD-NEW' } },
    { match: /^\/orders$/, method: 'POST', status: 201, body: { id: 'order-new' } },
  ]);
});

test('o comandă nouă poate fi creată cap-coadă din interfață', async ({ page }) => {
  const posts: Request[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && /\/api\/orders$/.test(request.url())) posts.push(request);
  });

  await page.goto('/orders');
  await page.getByRole('button', { name: 'Creează comandă', exact: true }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Creează comandă nouă' })).toBeVisible();

  // Step 1 — client.
  await dialog.locator('#wiz-client').click();
  await page.getByRole('option', { name: 'Alpha Logistics SRL' }).click();
  await dialog.getByRole('button', { name: 'Pasul următor' }).click();
  await expect(dialog.getByText(/Pas\s*2 of 3/)).toBeVisible();

  // Step 2 — addresses, resolved through the mocked autocomplete + geocode.
  const addresses = dialog.getByPlaceholder('Stradă, Număr, Cod Poștal, Oraș');
  await addresses.nth(0).fill('Hauptstraße 1, 10115 Berlin');
  await page.getByText('Hauptstraße 1, 10115 Berlin').last().click();

  await addresses.nth(1).fill('Via Roma 10, 20121 Milano');
  await page.getByText('Via Roma 10, 20121 Milano').last().click();

  // Step 2 — the minimum date of each time window.
  const setToday = async (label: string) => {
    await dialog
      .locator('label', { hasText: label })
      .locator('xpath=following-sibling::div[1]')
      .getByRole('button')
      .first()
      .click();
    await page.getByRole('button', { name: 'Astăzi' }).last().click();
  };
  await setToday('Interval Preluare (Min)');
  await setToday('Interval Livrare (Min)');

  await dialog.getByRole('button', { name: 'Pasul următor' }).click();
  await expect(dialog.getByText(/Pas\s*3 of 3/)).toBeVisible();

  // Step 3 — cargo.
  await dialog.getByPlaceholder('ex: Paleți componente electronice').fill('Paleti electronice');

  await dialog.getByRole('button', { name: 'Confirmă și salvează' }).click();

  await expect(page.getByText('Salvat')).toBeVisible();
  expect(posts).toHaveLength(1);
  const payload = posts[0].postDataJSON() as any;
  expect(payload.clientId).toBe('client-1');
  expect(payload.stops).toHaveLength(2);
  expect(payload.stops[0]).toMatchObject({ type: 'pickup', city: 'Berlin', latitude: BERLIN.lat });
  expect(payload.stops[1]).toMatchObject({ type: 'dropoff', city: 'Milano', latitude: MILANO.lat });
  expect(payload.cargoItems[0]).toMatchObject({ description: 'Paleti electronice' });
});
