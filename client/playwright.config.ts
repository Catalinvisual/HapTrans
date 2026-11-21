import { defineConfig, devices } from '@playwright/test';

/**
 * E2E smoke suite for the TMS.
 *
 * Every API call is mocked per test (see e2e/support/mocks.ts), so the suite is
 * deterministic and never touches the production API or real company data.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://127.0.0.1:5199',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1440, height: 900 },
    locale: 'ro-RO',
    timezoneId: 'Europe/Bucharest',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5199 --strictPort',
    url: 'http://127.0.0.1:5199/login',
    reuseExistingServer: true,
    timeout: 120_000,
    // Same-origin API: any request that misses a mock stays local instead of
    // reaching the production backend configured in .env.
    env: { VITE_API_URL: 'http://127.0.0.1:5199/api' },
  },
});
