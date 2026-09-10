const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway', ssl: { rejectUnauthorized: false } });
  await c.connect();
  const u = await c.query(`SELECT id, email, role, "companyId", "name" FROM users ORDER BY "createdAt"`);
  console.log('USERS total', u.rows.length);
  for (const r of u.rows) console.log(r.id.slice(0,8), r.email, r.role, r.companyId ? 'COMP' : 'NOCOMP', r.name);
  const o = await c.query(`SELECT count(*) AS t, count("companyId") AS w FROM orders`);
  console.log('orders total vs with companyId', o.rows[0]);
  const tr = await c.query(`SELECT count(*) AS t, count("companyId") AS w FROM trips`);
  console.log('trips total vs with companyId', tr.rows[0]);
  const cl = await c.query(`SELECT count(*) AS t, count("companyId") AS w FROM clients`);
  console.log('clients total vs with companyId', cl.rows[0]);
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });