import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// Source-contract guards only: these do not replace browser or API tests.
// Run from web: node --test tests/navigation-contract.test.mjs
const header = await readFile(new URL('../src/components/Header/Header.tsx', import.meta.url), 'utf8');
const globalCss = await readFile(new URL('../src/app/globals.css', import.meta.url), 'utf8');
const headerCss = await readFile(new URL('../src/components/Header/Header.module.css', import.meta.url), 'utf8');

test('desktop and mobile keep the logo supplied by company settings', () => {
  assert.ok(header.includes('process.env.NEXT_PUBLIC_API_URL'));
  assert.ok(header.includes('/public/company-settings'));
  assert.ok(header.includes('setLogoUrl(data.logo)'));
  assert.equal((header.match(/src=\{logoUrl\}/g) || []).length, 2);
});

test('existing navigation destinations remain present', () => {
  for (const route of ['/', '/diensten', '/routes', '/vloot', '/over-ons', '/cariere', '/contact', '/cere-oferta', '/track']) {
    assert.ok(header.includes(`href="${route}"`), `Missing route: ${route}`);
  }
  assert.ok(header.includes('https://joyful-exploration-production.up.railway.app/portal/login'));
});

test('all six language choices and the existing language provider remain wired', () => {
  assert.ok(header.includes('useLanguage()'));
  assert.ok(header.includes('setLang(l.code'));
  for (const language of ['RO', 'EN', 'NL', 'DE', 'FR', 'ES']) {
    assert.ok(header.includes(`code: '${language}'`), `Missing language: ${language}`);
  }
});

test('brand orange and reduced-motion support remain available', () => {
  assert.match(globalCss, /--brand:\s*#FF6A2B\s*;/i);
  assert.ok(globalCss.includes('prefers-reduced-motion: reduce'));
});

test('every header CSS-module reference has a corresponding selector', () => {
  const names = new Set([...header.matchAll(/styles\.([A-Za-z][A-Za-z0-9_]*)/g)].map((match) => match[1]));
  for (const name of names) {
    assert.match(headerCss, new RegExp(`\\.${name}(?![A-Za-z0-9_-])`), `Missing selector: ${name}`);
  }
});
