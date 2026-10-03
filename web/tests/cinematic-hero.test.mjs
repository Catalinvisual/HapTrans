import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// Source-contract checks, not browser tests. Run from web:
// node --test tests/*.test.mjs
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('cinematic enhancement preserves the original calculator byte for byte', async () => {
  const file = await readFile(new URL('../src/components/Hero/Hero.tsx', import.meta.url));
  const hash = createHash('sha1').update(`blob ${file.length}\0`).update(file).digest('hex');
  assert.equal(hash, '90d9fcf77dc2bb5f60035cadeff38370c8708f8b');
});

test('home keeps the existing Hero inside the presentation-only enhancement', async () => {
  const page = await read('src/app/page.tsx');
  assert.match(page, /<CinematicHeroLayer>\s*<Hero\s*\/>\s*<\/CinematicHeroLayer>/);
  for (const component of ['Header', 'TrustSection', 'Features', 'ServicesSection', 'HowItWorksSection', 'MapSection', 'TestimonialsSection', 'Footer']) {
    assert.ok(page.includes(`<${component} />`), component);
  }
});

test('scene contains no remote images, company logo or API integration', async () => {
  const source = await read('src/components/Hero/CinematicHeroLayer.tsx');
  assert.doesNotMatch(source, /<(?:image|img|video)\b/);
  assert.doesNotMatch(source, /company-settings|calculate-quote|setLogoUrl|fetch\(/);
  assert.ok(source.includes('children'));
  assert.ok(source.includes('useLanguage()'));
  for (const language of ['RO', 'EN', 'NL', 'DE', 'FR', 'ES']) {
    assert.match(source, new RegExp(`\\b${language}:`));
  }
});

test('scroll setup is scoped, optional and reversible', async () => {
  const source = await read('src/components/Hero/CinematicHeroLayer.tsx');
  assert.ok(source.includes('ScrollTrigger'));
  assert.ok(source.includes('prefers-reduced-motion: no-preference'));
  assert.ok(source.includes('context.revert()'));
  assert.ok(source.includes("removeEventListener('change'"));
  assert.doesNotMatch(source, /document\.body\.style|addEventListener\(['"](?:wheel|touchmove)/);
});

test('every cinematic CSS-module reference has a corresponding selector', async () => {
  const source = await read('src/components/Hero/CinematicHeroLayer.tsx');
  const css = await read('src/components/Hero/CinematicHeroLayer.module.css');
  const names = new Set([...source.matchAll(/styles\.([A-Za-z][A-Za-z0-9_]*)/g)].map((match) => match[1]));
  for (const name of names) assert.match(css, new RegExp(`\\.${name}(?![A-Za-z0-9_-])`), name);
  assert.ok(css.includes('prefers-reduced-motion: reduce'));
  assert.ok(css.includes('#FF6A2B'));
});
