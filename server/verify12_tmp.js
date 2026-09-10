const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway', ssl: { rejectUnauthorized: false } });
  await c.connect();
  const tests = [
    'UPDATE orders o SET "companyId" = COALESCE(NULLIF(o."companyId",\'\')::uuid, o.company_id)',
    'UPDATE orders o SET "clientId" = COALESCE(NULLIF(o."clientId",\'\')::uuid, o.customer_id)',
    'UPDATE orders o SET "createdById" = COALESCE(NULLIF(o."createdById",\'\')::uuid, o.created_by_id)',
    'UPDATE orders o SET "delayMinutes" = COALESCE(o."delayMinutes"::numeric, o.late_minutes, 0)',
  ];
  for (const q of tests) {
    try { await c.query(q); console.log('OK:', q.slice(0, 60)); }
    catch (e) { console.log('FAIL:', q.slice(0, 60), '->', e.message.split('\n')[0]); }
  }
  const q = `SELECT o."companyId"::uuid, o.company_id, o."clientId"::uuid, o.customer_id FROM orders o LIMIT 1`;
  try { console.log('probe:', JSON.stringify((await c.query(q)).rows[0])); } catch (e) { console.log('probe FAIL', e.message.split('\n')[0]); }
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });