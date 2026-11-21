import { test, expect } from '@playwright/test';
import { mockApi, seedSession, switchLanguage } from './support/mocks';

const notification = {
  id: 'notif-1',
  type: 'trip',
  title: 'notif_trip_title',
  // The backend stores the route as it was produced (Romanian here); the panel
  // must show the country names in the interface language.
  message: 'Transport Germania → Franța a fost actualizat.',
  isRead: false,
  createdAt: '2026-11-20T10:00:00.000Z',
};

test.beforeEach(async ({ page }) => {
  await seedSession(page, 'ro');
  await mockApi(page, [
    { match: /^\/notifications$/, body: { data: [notification], unreadCount: 1 } },
  ]);
});

test('notificarea apare în panou cu numele țărilor în română', async ({ page }) => {
  await page.goto('/orders');
  await page.locator('button:has(svg.lucide-bell)').first().click();

  await expect(page.getByText('Transport Germania → Franța a fost actualizat.')).toBeVisible();
});

test('numele țărilor din notificare se traduc când schimbi limba', async ({ page }) => {
  await page.goto('/orders');
  await page.locator('button:has(svg.lucide-bell)').first().click();
  await expect(page.getByText(/Germania/)).toBeVisible();

  // Clicking another header control closes the panel, so reopen it after the switch.
  await switchLanguage(page, 'English');
  await page.locator('button:has(svg.lucide-bell)').first().click();

  await expect(page.getByText('Transport Germany → France a fost actualizat.')).toBeVisible();
  await expect(page.getByText(/Germania/)).toBeHidden();
});
