import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const compact = value => value.replace(/\s+/g, ' ').trim();

test('portal presentation preserves the complete original login handler', async () => {
  const source = await read('src/pages/portal/PortalLoginPage.tsx');
  const start = source.indexOf('const handleSubmit');
  const end = source.indexOf('\n  return', start);
  assert.ok(start >= 0 && end > start, 'Login handler must remain identifiable');
  assert.equal(compact(source.slice(start, end)), compact(`const handleSubmit = async (e: React.FormEvent) => {
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

test('portal form keeps password semantics and loading protection', async () => {
  const source = await read('src/pages/portal/PortalLoginPage.tsx');
  assert.ok(source.includes("import portalApi from '../../lib/portalApi'"));
  assert.match(source, /type="password"/);
  assert.match(source, /autoComplete="current-password"/);
  assert.match(source, /autoComplete="username"/);
  assert.match(source, /onSubmit=\{handleSubmit\}/);
  assert.match(source, /disabled=\{loading\}/);
  assert.match(source, /htmlFor="portal-email"/);
  assert.match(source, /htmlFor="portal-password"/);
});

// Run: node --test client/tests/*.test.mjs (repository root).
// Source characterization only: not a live login test. Never submit production
// credentials or alter server authentication to make presentation tests pass.
