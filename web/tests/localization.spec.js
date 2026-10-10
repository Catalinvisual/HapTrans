const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
const LANGUAGES = ['RO', 'EN', 'NL', 'DE', 'FR', 'ES', 'PL'];

const LANG_LABELS = { RO: 'Română', EN: 'English', NL: 'Nederlands', DE: 'Deutsch', FR: 'Français', ES: 'Español', PL: 'Polski' };

const LANGS_IN_SOURCE = ['RO', 'EN', 'NL', 'DE', 'FR', 'ES', 'PL'];
const API_URL = '**/api/contact';

const ROUTES = [
  '/',
  '/diensten',
  '/routes',
  '/vloot',
  '/over-ons',
  '/cariere',
  '/contact',
  '/cere-oferta',
  '/track',
];

const NAV_KEYS = ['services', 'fleet', 'about', 'careers', 'contact'];

// Short, everyday dictionary words that may appear naturally in translated copy even
// though they are also translation keys. Anything longer is treated as a raw-key leak.
const WORDY_KEYS = new Set([
  'home',
  'about',
  'back',
  'error',
  'name',
  'notes',
  'cargo',
  'fleet',
  'careers',
  'services',
  'contact',
  'route',
  'routes',
  'email',
  'phone',
  'loading',
  'role',
  'send',
  'address',
  'company',
]);

const T_CALL_RE = /\bt\s*\(\s*['"][^'"]+['"]\s*\)/g;
const FFFD = '\uFFFD';
const MID_WORD_QUESTION = /\w\?\w/g;

const ctxPath = path.join(__dirname, '..', 'src', 'context', 'LanguageContext.tsx');
const ctxSource = fs.readFileSync(ctxPath, 'utf8');

function parseTranslations(source) {
  const out = {};
  const lineRe = /^[ \t]*([A-Za-z][A-Za-z0-9]*): \{([\s\S]*)\}(?:,)?[ \t]*(\r?)$/;
  for (const rawLine of source.split(/\r?\n/)) {
    const m = lineRe.exec(rawLine);
    if (!m) continue;
    const key = m[1];
    const body = m[2];
    const entry = {};
    for (const lang of LANGS_IN_SOURCE) {
      const v = new RegExp(lang + ":\\s*(['\"])((?:[^\\\\]|\\\\.)*?)\\1").exec(body);
      entry[lang] = v ? v[2].replace(/\\(['"\\])/g, '$1') : undefined;
    }
    out[key] = entry;
  }
  return out;
}

const TRANSLATIONS = parseTranslations(ctxSource);
const ALL_KEYS = Object.keys(TRANSLATIONS);
const GLOBAL_KEYS = ALL_KEYS.filter(
  (key) => TRANSLATIONS[key] && LANGS_IN_SOURCE.every((lang) => typeof TRANSLATIONS[key][lang] === 'string' && TRANSLATIONS[key][lang].trim() !== '')
);

function breakdownText(text) {
  const issues = [];
  for (const key of GLOBAL_KEYS) {
    if (WORDY_KEYS.has(key) || key.length < 5) continue;
    if (new RegExp('\\b' + key + '\\b').test(text)) issues.push(`cheie netradusă „${key}”`);
  }
  if (text.includes(FFFD)) issues.push('caractere de înlocuire U+FFFD (�)');
  const q = text.match(MID_WORD_QUESTION);
  if (q && q.length) issues.push(`„?” întrerupe cuvinte: ${q.slice(0, 5).join(', ')}`);
  const tc = text.match(T_CALL_RE);
  if (tc && tc.length) issues.push(`apeluri t() neprocesate: ${tc.slice(0, 5).join(', ')}`);
  return issues;
}

async function checkSelectorsForLeaks(page, issues) {
  const clickables = page.locator('button, a.btn, input[type="submit"], [role="button"]');
  const n = await clickables.count();
  for (let i = 0; i < n; i++) {
    const txt = (await clickables.nth(i).innerText() || '').trim();
    if (!txt) continue;
    if (txt.match(T_CALL_RE)) issues.push(`buton/link „${txt}” conține cheie brută`);
    if (GLOBAL_KEYS.includes(txt)) issues.push(`buton/link este exact cheia „${txt}”`);
    if (txt.includes(FFFD)) issues.push(`buton/link cu caractere corupte „${txt}”`);
    if (txt.match(MID_WORD_QUESTION)) issues.push(`buton/link cu „?” rupt „${txt}”`);
  }
  const placeholders = page.locator('input[placeholder], textarea[placeholder]');
  const pn = await placeholders.count();
  for (let i = 0; i < pn; i++) {
    const txt = (await placeholders.nth(i).getAttribute('placeholder')) || '';
    if (!txt) continue;
    if (txt.includes(FFFD) || txt.match(MID_WORD_QUESTION)) issues.push(`placeholder corupt „${txt}”`);
    if (txt.match(T_CALL_RE)) issues.push(`placeholder cu cheie brută „${txt}”`);
  }
  const headings = page.locator('h1, h2, h3');
  const hn = await headings.count();
  for (let i = 0; i < hn; i++) {
    const txt = (await headings.nth(i).innerText() || '').trim();
    if (!txt) continue;
    if (txt.includes(FFFD)) issues.push(`titlu corupt „${txt}”`);
  }
}

async function setupLanguage(page, lang) {
  await page.addInitScript((code) => localStorage.setItem('hapcargo_lang', code), lang);
}

async function gotoWithNavCheck(page, lang, route) {
  await page.goto(BASE_URL + route, { waitUntil: 'domcontentloaded' });
  const firstNavLabel = (TRANSLATIONS[NAV_KEYS[0]] || {})[lang] || '';
  await expect(page.locator('nav').first()).toContainText(firstNavLabel, { timeout: 30_000 });
  await page.waitForTimeout(400);
}

async function fillContactForm(page) {
  await page.locator('input[name="name"]').fill('Localization Test');
  await page.locator('input[name="email"]').fill('localization@example.com');
  await page.locator('input[name="subject"]').fill('Localization suite');
  await page.locator('textarea[name="message"]').fill('Teste de localizare E2E.');
}

test.describe('Audit static sursă i18n (LanguageContext.tsx)', () => {
  test('Fiecare cheie are toate limbile definite, traducerile nu conțin caractere corupte', () => {
    if (GLOBAL_KEYS.length === 0) {
      throw new Error('Nu am putut parsa nicio cheie din LanguageContext.tsx — verificați regex-ul de extragere.');
    }
    const missing = [];
    const corrupt = [];
    for (const key of ALL_KEYS) {
      const t = TRANSLATIONS[key] || {};
      for (const lang of LANGS_IN_SOURCE) {
        const v = t[lang];
        if (typeof v !== 'string' || v.trim() === '') missing.push(`${key}[${lang}]`);
      }
      for (const lang of LANGS_IN_SOURCE) {
        const v = t[lang];
        if (typeof v === 'string' && (v.includes(FFFD) || v.match(MID_WORD_QUESTION))) {
          corrupt.push(`${key}[${lang}] = ${JSON.stringify(v)}`);
        }
      }
    }
    expect(missing, `Traduceri lipsă:\n${missing.join('\n')}`).toEqual([]);
    expect(corrupt, `Valori corupte (U+FFFD sau „?” rupt):\n${corrupt.join('\n')}`).toEqual([]);
  });

  test('Formatul cheilor: fără separatori de namespace (punct sau două puncte)', () => {
    const bad = ALL_KEYS.filter((key) => /[.:]/.test(key));
    expect(bad).toEqual([]);
  });
});

for (const lang of LANGUAGES) {
  const label = LANG_LABELS[lang] || lang;
  const navLabel = (key) => (TRANSLATIONS[key] || {})[lang] || `<missing:${key}>`;

  test.describe(`[LOCALIZATION TEST] - Limba: ${lang} (${label})`, () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test.describe('Navigarea și paginile', () => {
      for (const route of ROUTES) {
        test(`Pagina ${route}: fără chei brute, text uitat sau caractere corupte în DOM`, async ({ page }) => {
          await setupLanguage(page, lang);
          await gotoWithNavCheck(page, lang, route);

          const issues = [];
          const bodyText = await page.locator('body').innerText();
          issues.push(...breakdownText(bodyText));
          await checkSelectorsForLeaks(page, issues);

          // Limba selectată în comutatorul de limbă trebuie să fie exact codul curent.
          const langCode = page.locator('button[aria-haspopup="menu"]').first();
          await expect(langCode).toContainText(lang, { timeout: 10_000 });

          // Navigatorul trebuie să conțină etichetele traduse ale limbii curente.
          const nav = page.locator('nav').first();
          for (const key of NAV_KEYS) {
            await expect(nav).toContainText(navLabel(key), { timeout: 10_000 });
          }

          expect(issues, `Probleme detectate pe ${route} (${lang}):\n${issues.join('\n')}`).toEqual([]);
        });
      }
    });

    test.describe('Câmpuri dinamice și tost-uri (react-hot-toast)', () => {
      test('Pagina /contact: validarea HTML5, eroare și succes traduse', async ({ page }) => {
        await setupLanguage(page, lang);

        const errText = navLabel('contactError');
        const okText = navLabel('contactSuccess');
        const sentText = navLabel('contactMessageSent');

        test.info().annotations.push({
          type: 'limbă',
          description: `${lang} → eroare: „${errText}”, succes: „${okText}”, trimis: „${sentText}”`,
        });

        await gotoWithNavCheck(page, lang, '/contact');

        // 1. Submit pe formular gol → validare HTML5 nativă (browser bubble), fără crash.
        const form = page.locator('form').first();
        await form.evaluate((el) => el.requestSubmit());
        await expect(form).toBeVisible();
        const emptyBody = await page.locator('body').innerText();
        expect(breakdownText(emptyBody), 'au apărut chei brute după submit gol').toEqual([]);

        // 2. Forțăm eșecul backend-ului → toast() de eroare + mesaj inline în formular.
        await page.route(API_URL, (route) =>
          route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false }) })
        );
        await fillContactForm(page);
        await form.evaluate((el) => el.requestSubmit());
        await expect(page.locator('[data-testid="app-toast"]').filter({ hasText: errText })).toBeVisible({ timeout: 10_000 });
        await expect(form).toContainText(errText, { timeout: 10_000 });
        await page.unroute(API_URL);

        // 3. Succes → toast() de succes + mesajul de confirmare lângă formular.
        await page.route(API_URL, (route) =>
          route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
        );
        await fillContactForm(page);
        await form.evaluate((el) => el.requestSubmit());
        await expect(page.locator('[data-testid="app-toast"]').filter({ hasText: okText })).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('body')).toContainText(sentText, { timeout: 10_000 });
        await page.unroute(API_URL);

        // 4. Toast-ul afișat nu poate conține caractere corupte.
        const toastText = await page.locator('[data-testid="app-toast"]').filter({ hasText: okText }).innerText().catch(() => '');
        if (toastText.trim()) {
          expect(toastText.includes(FFFD), `toast cu caractere corupte: „${toastText}”`).toBe(false);
          expect(toastText.match(T_CALL_RE), `toast cu cheie brută: „${toastText}”`).toBe(null);
        }
      });
    });
  });
}