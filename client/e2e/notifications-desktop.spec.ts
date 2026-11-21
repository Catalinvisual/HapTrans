import { test, expect } from '@playwright/test';
import { mockApi, seedSession, switchLanguage } from './support/mocks';

/**
 * The desktop toast is produced by a poller that is mounted once. This test
 * switches the interface to Dutch after the app has already started, then makes
 * a new notification arrive: its country names must follow the selected
 * language, not the language the poller was created with.
 */
test('toast-ul Windows folosește limba selectată după pornire', async ({ page }) => {
  await page.clock.install();

  await page.addInitScript(() => {
    const notifications: Array<{ title: string; body?: string }> = [];
    (window as any).__desktopNotifications = notifications;
    class FakeNotification {
      static permission = 'granted';
      static requestPermission = async () => 'granted';
      constructor(title: string, options?: { body?: string }) {
        notifications.push({ title, body: options?.body });
      }
    }
    (window as any).Notification = FakeNotification;
  });

  let polls = 0;
  await seedSession(page, 'ro');
  await mockApi(page, [
    {
      match: /^\/notifications$/,
      body: () => {
        polls += 1;
        // Nothing on the very first load, then a read notification that only
        // seeds the last-seen id, and finally new unread ones so a toast is
        // raised strictly after the language switch.
        if (polls === 1) return { data: [], unreadCount: 0 };
        const notification = {
          id: polls === 2 ? 'notif-seed' : `notif-${polls}`,
          type: 'trip',
          title: 'notif_trip_title',
          message: 'Transport Germania → Franța a fost actualizat.',
          isRead: polls === 2,
          createdAt: '2026-11-20T10:00:00.000Z',
        };
        return { data: [notification], unreadCount: polls === 2 ? 0 : 1 };
      },
    },
  ]);

  await page.goto('/orders');
  await expect(page.locator('main')).toBeVisible();

  await switchLanguage(page, 'Nederlands');
  const stored = await page.evaluate(() => localStorage.getItem('hapcargo_lang'));
  expect(stored).toBe('nl');

  // Ignore any toast raised while the app was still in Romanian.
  await page.evaluate(() => {
    (window as any).__desktopNotifications.length = 0;
  });

  // Fast-forward the 60s notification poll.
  await page.clock.runFor(61_000);

  await expect
    .poll(() => page.evaluate(() => ((window as any).__desktopNotifications || []).length), {
      timeout: 15_000,
    })
    .toBeGreaterThan(0);

  const toast = await page.evaluate(
    () => ((window as any).__desktopNotifications as Array<{ title: string; body?: string }>).at(-1),
  );
  expect(toast?.title).toBe('Ritstatus Update');
  expect(toast?.body).toContain('Duitsland');
  expect(toast?.body).toContain('Frankrijk');
  expect(toast?.body).not.toContain('Germania');
  expect(toast?.body).not.toContain('Franța');
});
