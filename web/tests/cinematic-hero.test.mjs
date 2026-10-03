import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
// Source contracts only; browser playback, lint, typecheck and build are also required.
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
test('original calculator remains byte-for-byte unchanged', async () => {
  const file = await readFile(new URL('../src/components/Hero/Hero.tsx', import.meta.url));
  assert.equal(createHash('sha1').update('blob ' + file.length + '\0').update(file).digest('hex'), '90d9fcf77dc2bb5f60035cadeff38370c8708f8b');
});
test('page preserves the presentation seam and all existing sections', async () => {
  const page = await read('src/app/page.tsx');
  assert.match(page, /<CinematicHeroLayer>\s*<Hero\s*\/>\s*<\/CinematicHeroLayer>/);
  for (const name of ['Header', 'TrustSection', 'Features', 'ServicesSection', 'HowItWorksSection', 'MapSection', 'TestimonialsSection', 'Footer']) assert.ok(page.includes(`<${name} />`));
});
test('real video replaces SVG and external animation scripts, not backend logic', async () => {
  const code = await read('src/components/Hero/CinematicHeroLayer.tsx');
  assert.match(code, /<video/);
  assert.match(code, /muted loop playsInline/);
  assert.match(code, /poster=/);
  assert.match(code, /onError=/);
  assert.doesNotMatch(code, /<svg|ScrollTrigger|gsap|calculate-quote|company-settings/);
  for (const language of ['RO', 'EN', 'NL', 'DE', 'FR', 'ES']) assert.match(code, new RegExp(`\\b${language}:`));
});
test('playback is optional and cleans up visibility and motion listeners', async () => {
  const code = await read('src/components/Hero/CinematicHeroLayer.tsx');
  for (const expected of ['prefers-reduced-motion: reduce', 'IntersectionObserver', 'observer.disconnect()', "removeEventListener('change'", "removeEventListener('visibilitychange'", '.play().catch(']) assert.ok(code.includes(expected), expected);
  assert.doesNotMatch(code, /document\.body\.style/);
});
test('hero stays inside viewport and has matching CSS-module selectors', async () => {
  const code = await read('src/components/Hero/CinematicHeroLayer.tsx');
  const css = await read('src/components/Hero/CinematicHeroLayer.module.css');
  assert.match(css, /max-height: 100svh/);
  assert.match(css, /min-height: 0/);
  assert.match(css, /--hero-offset/);
  assert.ok(css.includes('#FF6A2B'));
  for (const match of code.matchAll(/styles\.([A-Za-z][A-Za-z0-9_]*)/g)) assert.match(css, new RegExp(`\\.${match[1]}(?![A-Za-z0-9_-])`));
});
