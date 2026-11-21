import { test, expect } from '@playwright/test';
import { mockApi, switchLanguage } from './support/mocks';

const SIGN_IN: Record<string, string> = {
  ro: 'Autentificare',
  en: 'Sign in',
  nl: 'Inloggen',
  de: 'Anmelden',
  fr: 'Se connecter',
  es: 'Iniciar sesión',
  pl: 'Zaloguj się',
};

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'pl', label: 'Polski' },
];

test.describe('Autentificare', () => {
  test('o rută privată fără sesiune redirecționează la /login', async ({ page }) => {
    await mockApi(page);
    await page.goto('/orders');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('form')).toBeVisible();
  });

  test('formularul gol nu se trimite', async ({ page }) => {
    await mockApi(page);
    await page.goto('/login');

    await page.getByRole('button', { name: SIGN_IN.ro }).click();

    await expect(page).toHaveURL(/\/login$/);
    const emailInvalid = await page
      .locator('input[type="email"]')
      .evaluate((el) => !(el as HTMLInputElement).validity.valid);
    expect(emailInvalid).toBe(true);
  });

  test('butonul de ochi arată/ascunde parola', async ({ page }) => {
    await mockApi(page);
    await page.goto('/login');

    const password = page.locator('input[autocomplete="current-password"]');
    await password.fill('secret123');
    await expect(password).toHaveAttribute('type', 'password');

    await password.locator('xpath=..').getByRole('button').click();
    await expect(password).toHaveAttribute('type', 'text');

    await password.locator('xpath=..').getByRole('button').click();
    await expect(password).toHaveAttribute('type', 'password');
  });

  test('credențialele greșite afișează mesajul serverului', async ({ page }) => {
    await mockApi(page, [
      {
        match: /^\/auth\/login$/,
        method: 'POST',
        status: 401,
        body: { message: 'Date de autentificare invalide' },
      },
    ]);
    await page.goto('/login');

    await page.locator('input[type="email"]').fill('admin@hapcargo.ro');
    await page.locator('input[autocomplete="current-password"]').fill('wrong-password');
    await page.getByRole('button', { name: SIGN_IN.ro }).click();

    await expect(page.getByText('Date de autentificare invalide').first()).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('login reușit salvează sesiunea și intră în dashboard', async ({ page }) => {
    await mockApi(page, [
      {
        match: /^\/auth\/login$/,
        method: 'POST',
        body: {
          access_token: 'e2e-access-token',
          refresh_token: 'e2e-refresh-token',
          refresh_token_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          user: {
            id: 'e2e-user',
            email: 'admin@hapcargo.ro',
            name: 'E2E Admin',
            role: 'admin',
            language: 'ro',
          },
        },
      },
    ]);
    await page.goto('/login');

    await page.locator('input[type="email"]').fill('admin@hapcargo.ro');
    await page.locator('input[autocomplete="current-password"]').fill('correct-password');
    await page.getByRole('button', { name: SIGN_IN.ro }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    const token = await page.evaluate(() => localStorage.getItem('hapcargo_token'));
    expect(token).toBe('e2e-access-token');
  });

  for (const language of LANGUAGES) {
    test(`interfața se traduce în ${language.label}`, async ({ page }) => {
      await mockApi(page);
      await page.goto('/login');
      await expect(page.getByRole('button', { name: SIGN_IN.ro })).toBeVisible();

      await switchLanguage(page, language.label);

      await expect(page.getByRole('button', { name: SIGN_IN[language.code] })).toBeVisible();
      const stored = await page.evaluate(() => localStorage.getItem('hapcargo_lang'));
      expect(stored).toBe(language.code);
    });
  }
});
