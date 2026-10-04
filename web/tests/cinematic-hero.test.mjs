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
test('hero uses the uploaded video without the old poster or background image', async () => {
  const code = await read('src/components/Hero/CinematicHeroLayer.tsx');
  assert.ok(code.includes("const source = '/herovideo.mp4'"));
  assert.doesNotMatch(code, /hero-nou\.jpg|poster\s*=|backgroundImage|pexels|<svg|ScrollTrigger|gsap|calculate-quote|company-settings/i);
  assert.match(code, /muted loop playsInline/);
  assert.match(code, /preload="auto"/);
  assert.match(code, /onError=/);
  for (const language of ['RO', 'EN', 'NL', 'DE', 'FR', 'ES']) assert.match(code, new RegExp(`\\b${language}:`));
});
test('playback is optional and cleans up visibility and motion listeners', async () => {
  const code = await read('src/components/Hero/CinematicHeroLayer.tsx');
  for (const expected of ['prefers-reduced-motion: reduce', 'IntersectionObserver', 'observer.disconnect()', "removeEventListener('change'", "removeEventListener('visibilitychange'", '.play().catch(']) assert.ok(code.includes(expected), expected);
  assert.doesNotMatch(code, /document\.body\.style/);
});
test('hero has no internal scrolling or scroll interception', async () => {
  const code = await read('src/components/Hero/CinematicHeroLayer.tsx');
  const css = await read('src/components/Hero/CinematicHeroLayer.module.css');
  assert.doesNotMatch(css, /overflow(?:-[xy])?\s*:\s*(?:auto|scroll)|overscroll-behavior/);
  assert.doesNotMatch(code, /addEventListener\(['"](?:scroll|wheel|touchmove)/);
  assert.match(css, /max-height: 100svh/);
  assert.match(css, /min-height: 0/);
  assert.match(css, /--hero-offset/);
  assert.ok(css.includes('#FF6A2B'));
  for (const match of code.matchAll(/styles\.([A-Za-z][A-Za-z0-9_]*)/g)) assert.match(css, new RegExp(`\\.${match[1]}(?![A-Za-z0-9_-])`));
});
test('inner page headings are compact rather than oversized dark hero cards', async () => {
  const generic = await read('src/components/GenericPage/GenericPage.module.css');
  const routes = await read('src/app/routes/RoutesPage.module.css');
  assert.match(generic, /\.heroBanner\s*\{[^}]*background:\s*transparent\s*!important/);
  assert.match(generic, /\.heroTitle\s*\{[^}]*font-size:\s*clamp\(1\.75rem,3vw,2\.5rem\)/);
  assert.match(routes, /\.title\s*\{[^}]*font-size:\s*clamp\(1\.75rem,3vw,2\.5rem\)/);
  assert.doesNotMatch(routes, /radial-gradient|box-shadow/);
});
