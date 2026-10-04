import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('no hard-coded countries are counted as database countries', async () => {
  const stats = await read('../src/components/Hero/TmsStats.tsx');
  assert.doesNotMatch(stats, /defaultCountries|return\s+defaultCountries\.length/);
  assert.match(stats, /website-cms/);
  const map = await read('../src/components/MapSection/MapSection.tsx');
  assert.doesNotMatch(map, /ordered\.length\s*\?\s*ordered\s*:\s*coreHubs/);
});

test('stats card overlaps hero without changing the quote calculator', async () => {
  const css = await read('../src/components/Hero/TmsStats.module.css');
  assert.match(css, /margin:\s*-1[4-9]\dpx\s+auto\s+0/);
  assert.match(css, /z-index:\s*[4-9]/);
  const page = await read('../src/app/page.tsx');
  assert.match(page, /<TmsStats\s*\/>/);
});
