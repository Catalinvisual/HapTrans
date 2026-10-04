import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const read = path => readFile(new URL('../../' + path, import.meta.url), 'utf8');
const compact = text => text.replace(/\s+/g, ' ').trim();
test('tracking input retains the exact existing token handling', async () => {
  const code = await read('web/src/app/track/page.tsx');
  const handler = code.slice(code.indexOf('const handleTrack'), code.indexOf('\n  return ('));
  assert.equal(compact(handler), compact(`const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    let cleanToken = token.trim();
    if (cleanToken.includes('/track/')) {
      const parts = cleanToken.split('/track/');
      cleanToken = parts[parts.length - 1] || '';
    }
    // Clean query parameters or trailing slashes
    cleanToken = cleanToken.split('?')[0].split('#')[0].replace(/\\/$/, '');
    if (cleanToken) { router.push(\u0060/track/\u0024{cleanToken}\u0060); }
  };`));
});
test('portal login preserves the existing request, storage, navigation and errors', async () => {
  const code = await read('client/src/pages/portal/PortalLoginPage.tsx');
  const handler = code.slice(code.indexOf('const handleSubmit'), code.indexOf('\n  return'));
  assert.equal(compact(handler), compact(`const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await portalApi.post('/portal-auth/login', { email, password });
      localStorage.setItem('portal_token', res.data.access_token);
      localStorage.setItem('portal_user', JSON.stringify(res.data.user));
      toast.success(t("toast_loginSuccessfu"));
      navigate('/portal/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally { setLoading(false); }
  };`));
});
test('progress rounds its advancing edge only at completion', async () => {
  const css = await read('web/src/components/Header/Header.module.css');
  assert.ok(css.includes('border-top-right-radius: 0'));
  assert.ok(css.includes('[style*="width: 100%"]'));
});
test('footer remains content-driven after compacting', async () => {
  const css = await read('web/src/components/Footer/Footer.module.css');
  assert.ok(css.includes('clamp(48px,6vw,80px)'));
  const block = css.match(/\.footer\.footer\s*\{([^}]*)\}/)?.[1];
  assert.ok(block);
  // A custom property named --footer-curve-height is not a fixed footer height.
  assert.doesNotMatch(block, /(?:^|;)\s*(?:height|max-height)\s*:/);
});
test('new page styles are wired and have reduced-motion support', async () => {
  for (const [page, sheet] of [
    ['web/src/app/track/page.tsx', 'web/src/app/track/TrackPage.module.css'],
    ['client/src/pages/portal/PortalLoginPage.tsx', 'client/src/pages/portal/PortalLoginPage.module.css'],
    ['web/src/app/routes/page.tsx', 'web/src/app/routes/RoutesPage.module.css'],
  ]) {
    const code = await read(page);
    const css = await read(sheet);
    assert.ok(code.includes(sheet.split('/').at(-1)));
    assert.ok(css.includes('prefers-reduced-motion: reduce'));
    for (const [, name] of code.matchAll(/styles\.([A-Za-z][A-Za-z0-9_]*)/g)) assert.match(css, new RegExp('\\.' + name + '(?![A-Za-z0-9_-])'));
  }
});
// Run from repository root: node --test web/tests/*.test.mjs
// Source characterization only. Browser, lint, typecheck and builds are required.
