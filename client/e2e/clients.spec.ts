import { test, expect, type Request } from '@playwright/test';
import { mockApi, seedSession } from './support/mocks';

function clientPosts(requests: Request[]) {
  return requests.filter(
    (request) => /\/api\/clients$/.test(request.url()) && request.method() === 'POST',
  );
}

test.beforeEach(async ({ page }) => {
  await seedSession(page);
  await mockApi(page, [
    { match: /^\/clients$/, method: 'GET', body: [] },
    {
      match: /^\/clients$/,
      method: 'POST',
      status: 201,
      body: { id: 'new-client', name: 'Test Client SRL', createdAt: '2026-11-20T10:00:00.000Z' },
    },
  ]);
});

test('nu trimite clientul fără nume', async ({ page }) => {
  const posts: Request[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST') posts.push(request);
  });

  await page.goto('/clients');
  await page.getByRole('button', { name: 'Adaugă client' }).click();

  const drawer = page.getByRole('dialog');
  await expect(drawer.getByRole('heading', { name: 'Adaugă client' })).toBeVisible();

  await drawer.getByRole('button', { name: 'Salvează' }).click();

  await expect(page.getByText('Numele clientului este obligatoriu.')).toBeVisible();
  expect(clientPosts(posts)).toHaveLength(0);
});

test('creează clientul și îl salvează prin API', async ({ page }) => {
  const posts: Request[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST') posts.push(request);
  });

  await page.goto('/clients');
  await page.getByRole('button', { name: 'Adaugă client' }).click();

  const drawer = page.getByRole('dialog');
  await drawer.locator('input').first().fill('Test Client SRL');
  await drawer.locator('input').nth(3).fill('contact@testclient.ro');
  await drawer.getByRole('button', { name: 'Salvează' }).click();

  // Saving always asks for confirmation before it reaches the API.
  await expect(page.getByText('Salvare modificări')).toBeVisible();
  await page.getByRole('button', { name: 'Salvează' }).last().click();

  await expect(page.getByText('Client adăugat')).toBeVisible();
  const sent = clientPosts(posts);
  expect(sent).toHaveLength(1);
  expect(sent[0].postDataJSON()).toMatchObject({
    name: 'Test Client SRL',
    contactEmail: 'contact@testclient.ro',
  });
  await expect(page.getByRole('dialog')).toBeHidden();
});
