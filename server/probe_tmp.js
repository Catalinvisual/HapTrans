const base = 'http://localhost:3112/api';
async function main() {
  const login = await fetch(base + '/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@hapcargo.com', password: 'Laptophp2025.' }),
  });
  const lt = await login.text();
  console.log('LOGIN', login.status, lt.slice(0, 300));
  let token = null;
  try {
    const j = JSON.parse(lt);
    token = (j.access_token || j.token || j.data?.access_token || j.data?.token);
  } catch (_) {}
  if (!token) { console.log('NO TOKEN'); return; }
  const H = { Authorization: 'Bearer ' + token };
  const eps = ['/companies', '/orders', '/trips', '/clients', '/trucks', '/invoices', '/payments', '/drivers', '/users'];
  for (const ep of eps) {
    const r = await fetch(base + ep, { headers: H });
    const t = await r.text();
    let arr = [];
    try { const j = JSON.parse(t); arr = Array.isArray(j) ? j : (j.data ? (Array.isArray(j.data) ? j.data : []) : []); } catch (_) {}
    console.log(ep, r.status, 'count=' + arr.length, t.slice(0, 80).replace(/\s+/g, ' '));
  }
  // companies detail (settings page)
  const r = await fetch(base + '/companies', { headers: H });
  const t = await r.text();
  console.log('COMPANIES RAW', r.status, t.slice(0, 200));
}
main().catch(e => { console.error(e); process.exit(1); });