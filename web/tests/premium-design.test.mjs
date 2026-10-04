import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
// Characterization guards: presentation changes must not alter data submission.
const protectedFiles = {
  'src/components/Hero/Hero.tsx': '90d9fcf77dc2bb5f60035cadeff38370c8708f8b',
  'src/components/QuoteForm/QuoteForm.tsx': '4a1d94e7c5cc062fde4d2f80369b113b1744477c',
  'src/app/contact/page.tsx': 'c4233ebc95184a1272f8f4d593b481609429f89e',
  'src/components/GenericPage/GenericPage.tsx': '64b01e4bde8f649a0274406e5e398c6ef5195c1a',
};
for (const [path, hash] of Object.entries(protectedFiles)) {
  test('premium presentation preserves ' + path, async () => {
    const bytes = await readFile(new URL('../' + path, import.meta.url));
    assert.equal(createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex'), hash);
  });
}
test('support card is removed, remaining translated cards are preserved', async () => {
  const code = await read('src/components/Features/Features.tsx');
  assert.doesNotMatch(code, /feat3Title|feat3Desc|feat3Langs|avatarStack|avatarMore/);
  for (const key of ['feat1Title', 'feat2Title', 'feat4Title']) assert.ok(code.includes(key));
  assert.match(code, /id="despre"/);
});
test('premium styles are loaded and support reduced motion', async () => {
  const layout = await read('src/app/layout.tsx');
  assert.ok(layout.includes('./premium.css'));
  const css = await read('src/app/premium.css');
  assert.ok(css.includes('prefers-reduced-motion: reduce'));
  assert.ok(css.includes('#FF6A2B'));
  assert.ok(css.includes('main > footer::before'));
  assert.doesNotMatch(css, /scroll-snap|scroll-behavior|overflow-y:\s*(auto|scroll)/);
});
// These are source-contract tests, not browser interaction or visual tests.
