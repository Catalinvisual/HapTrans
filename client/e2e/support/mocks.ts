import type { Page } from '@playwright/test';

/** A mocked API response, matched against the request path (without /api). */
export interface ApiMock {
  match: RegExp;
  method?: string;
  status?: number;
  /** Static JSON, or a function of the request URL (for query-dependent mocks). */
  body?: unknown | ((url: URL) => unknown);
}

function json(status: number, body: unknown) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

/**
 * Intercepts every call to the API. Unmatched endpoints get an empty list, so a
 * page renders its empty state instead of trying the network.
 */
export async function mockApi(page: Page, mocks: ApiMock[] = []) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, body: '' });
    }
    const path = new URL(request.url()).pathname.replace(/^\/api/, '');
    if (process.env.DEBUG_MOCKS) console.log('API', request.method(), path);
    const hit = mocks.find(
      (mock) => mock.match.test(path) && (!mock.method || mock.method === request.method()),
    );
    if (hit) {
      const body = typeof hit.body === 'function' ? (hit.body as (url: URL) => unknown)(new URL(request.url())) : hit.body;
      return route.fulfill(json(hit.status ?? 200, body ?? null));
    }
    if (path === '/notifications') return route.fulfill(json(200, { data: [], unreadCount: 0 }));
    return route.fulfill(json(200, []));
  });

  // The layout opens a websocket; without the real backend it would only log
  // noise, and the country flags are decorative.
  await page.route('**/socket.io/**', (route) => route.abort());
  await page.route('**/flagcdn.com/**', (route) => route.abort());
}

/** Puts a signed-in session in local storage before the app boots. */
export async function seedSession(page: Page, lang = 'ro') {
  await page.addInitScript((language) => {
    const user = {
      id: 'e2e-user',
      email: 'admin@hapcargo.ro',
      name: 'E2E Admin',
      role: 'admin',
      language,
    };
    localStorage.setItem('hapcargo_lang', language);
    localStorage.setItem('hapcargo_token', 'e2e-token');
    // zustand/persist shape used by authStore.
    localStorage.setItem('hapcargo_auth', JSON.stringify({ state: { user, token: 'e2e-token' }, version: 0 }));
  }, lang);
}

/** Changes the interface language the way the header dropdown does. */
export async function switchLanguage(page: Page, label: string) {
  // The dropdown trigger is the only button that renders a country flag.
  await page.locator('button:has(img[alt])').first().click();
  await page.getByRole('button', { name: label }).last().click();
}
