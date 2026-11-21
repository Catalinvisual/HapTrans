import { test, expect } from '@playwright/test';
import { mockApi, seedSession } from './support/mocks';

test.beforeEach(async ({ page }) => {
  await seedSession(page);
  await mockApi(page, [
    { match: /^\/clients$/, body: [{ id: 'client-1', name: 'Alpha Logistics SRL' }] },
  ]);
});

test('wizard-ul nu lasă comanda să avanseze fără client', async ({ page }) => {
  await page.goto('/orders');
  await page.getByRole('button', { name: 'Creează comandă', exact: true }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/Pas\s*1 of 3/)).toBeVisible();

  await dialog.getByRole('button', { name: 'Pasul următor' }).click();

  await expect(
    page.getByText('Vă rugăm să selectați un client înainte de a continua.'),
  ).toBeVisible();
  // The wizard must stay on the first step instead of skipping validation.
  await expect(dialog.getByText(/Pas\s*1 of 3/)).toBeVisible();
});

test('pasul de adrese cere adresa de preluare', async ({ page }) => {
  await page.goto('/orders');
  await page.getByRole('button', { name: 'Creează comandă', exact: true }).click();

  const dialog = page.getByRole('dialog');
  await dialog.locator('#wiz-client').click();
  await page.getByRole('option', { name: 'Alpha Logistics SRL' }).click();
  await dialog.getByRole('button', { name: 'Pasul următor' }).click();

  await expect(dialog.getByText(/Pas\s*2 of 3/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Pasul următor' }).click();

  await expect(page.getByText('Adresa de preluare este obligatorie.')).toBeVisible();
  await expect(dialog.getByText(/Pas\s*2 of 3/)).toBeVisible();
});
