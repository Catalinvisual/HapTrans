import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// Source contracts only. Browser, lint, typecheck and build still required.
// cd web && node --test tests/*.test.mjs
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('original calculator remains byte-for-byte unchanged', async () => {
  const file = await readFile(new URL('../src/components/Hero/Hero.tsx', import.meta.url));
  assert.equal(createHash('sha1').update(`blob ${file.length}\0`).update(file).digest('hex'), '90d9fcf77dc2bb5f60035cadeff38370c8708f8b');
});
test('page preserves the presentation seam and existing sections', async () => {
  const page = await read('src/app/page.tsx');
  assert.match(page, /<CinematicHeroLayer>\s*<Hero\s*\/>\s*<\/CinematicHeroLayer>/);
  for (const name of ['Header', 'TrustSection', 'Features', 'ServicesSection', 'HowItWorksSection', 'MapSection', 'TestimonialsSection', 'Footer']) assert.ok(page.includes(`<${name} />`));
});
test('vehicle remains unbranded with no remote imagery or API changes', async () => {
  const source = await read('src/components/Hero/CinematicHeroLayer.tsx');
  assert.doesNotMatch(source, /<(?:image|img|video)\b|company-settings|calculate-quote|setLogoUrl|fetch\(/);
  for (const language of ['RO', 'EN', 'NL', 'DE', 'FR', 'ES']) assert.match(source, new RegExp(`\\b${language}:`));
});
test('short screens and CDN failures retain functioning motion controls', async () => {
  const source = await read('src/components/Hero/CinematicHeroLayer.tsx');
  assert.ok(source.includes('ScrollTrigger'));
  assert.ok(source.includes('prefers-reduced-motion: reduce'));
  assert.ok(source.includes("addEventListener('scroll'"));
  assert.ok(source.includes("removeEventListener('scroll'"));
  assert.ok(source.includes('cancelAnimationFrame'));
  assert.ok(source.includes('IntersectionObserver'));
  assert.doesNotMatch(source, /min-height: 760px|pin:\s*host|pinType:|innerHeight \* 1\.8/);
  assert.doesNotMatch(source, /document\.body\.style|addEventListener\(['"](?:wheel|touchmove)/);
});
test('hero does not reserve multiple screens or create pin spacers', async () => {
  const css = await read('src/components/Hero/CinematicHeroLayer.module.css');
  const source = await read('src/components/Hero/CinematicHeroLayer.tsx');
  assert.doesNotMatch(css, /min-height:\s*760px|height:\s*(?:100|280)svh/);
  assert.ok(source.includes('pin: false'));
  assert.ok(css.includes('prefers-reduced-motion: reduce'));
  assert.ok(css.includes('#FF6A2B'));
  for (const match of source.matchAll(/styles\.([A-Za-z][A-Za-z0-9_]*)/g)) assert.match(css, new RegExp(`\\.${match[1]}(?![A-Za-z0-9_-])`));
});
