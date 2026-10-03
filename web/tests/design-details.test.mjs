import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const read = path => readFile(new URL('../src/components/' + path, import.meta.url), 'utf8');
test('advantages use one translated heading, not three equivalent introductions', async () => {
  const code = await read('Features/Features.tsx');
  assert.ok(code.includes("t('featuresTitle')"));
  assert.doesNotMatch(code, /t\('whyHapCargo'\)|t\('featuresSubtitle'\)/);
});
test('header progress is rounded independently of dropdowns', async () => {
  const css = await read('Header/Header.module.css');
  assert.match(css, /\.scrollProgress\s*\{[^}]*height:\s*100%/);
  assert.match(css, /\.scrollProgress\s*\{[^}]*border-radius:\s*inherit/);
  assert.doesNotMatch(css, /\.headerBar\s*\{[^}]*overflow:\s*(hidden|clip)/);
  assert.doesNotMatch(css, /border-radius:\s*12px\s*!important/);
});
test('footer owns its curved silhouette instead of relying on global selectors', async () => {
  const css = await read('Footer/Footer.module.css');
  assert.ok(css.includes('.footer.footer::before'));
  assert.ok(css.includes('--footer-curve-height'));
  assert.ok(css.includes('data:image/svg+xml'));
});
// Source contracts only. Still run lint, TypeScript, build and browser checks.
