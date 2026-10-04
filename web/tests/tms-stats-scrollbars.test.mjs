import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

// Source-contract regression tests; browser rendering still needs visual checks.
test('existing pricing payload and form redirects remain present', async () => {
  const hero = await read('../src/components/Hero/Hero.tsx');
  for (const value of ['/public/calculate-quote', 'JSON.stringify({', 'weightKg,', 'pallets,', '/cere-oferta?from=', 'encodeURIComponent(estimatedPriceRange)']) {
    assert.ok(hero.includes(value), value);
  }
});

test('public statistics use completed trips and verified emissions', async () => {
  const controller = await read('../../server/src/app.controller.ts');
  const stats = controller.split("@Get('public/stats')")[1].split("@Post('settings/company')")[0];
  assert.ok(stats.includes("['completed']"));
  assert.ok(stats.includes('euronorm'));
  assert.ok(stats.includes('euro6Trucks'));
  assert.ok(stats.includes('new Set'));
  assert.ok(stats.includes('companyId'));
  assert.doesNotMatch(stats, /countriesCount\s*=\s*24/);
  assert.doesNotMatch(stats, /error:\s*e\.toString/);
});

test('global orange scrollbars preserve accessibility and dialog corners', async () => {
  const css = await read('../src/app/premium.css');
  assert.ok(css.includes('scrollbar-color: #ff6a2b'));
  assert.ok(css.includes('::-webkit-scrollbar-thumb'));
  assert.ok(css.includes('border-radius: 999px'));
  assert.ok(css.includes('scrollbar-color: auto'));
  assert.ok(css.includes('border-block: 16px solid #fff'));
  assert.doesNotMatch(css, /scrollbar-width:\s*none/);
});

test('homepage replaces the old banner without changing the calculator', async () => {
  const home = await read('../src/app/page.tsx');
  const stats = await read('../src/components/Hero/TmsStats.tsx');
  const original = await read('../src/components/Hero/Hero.tsx');
  assert.match(home, /<TmsStats\s*\/>/);
  assert.match(home, /heroStyles\.statsBanner/);
  assert.match(stats, /\/public\/stats/);
  assert.match(stats, /euro6Trucks/);
  assert.match(stats, /Number\.isSafeInteger/);
  assert.match(stats, /updatedAt/);
  assert.doesNotMatch(stats, /100\+|5\.000\+|15\+|99,4/);
  assert.match(original, /\/public\/calculate-quote/);
});
