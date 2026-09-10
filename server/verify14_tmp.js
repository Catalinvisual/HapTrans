const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway', ssl: { rejectUnauthorized: false } });
  await c.connect();
  const q = `
    UPDATE orders o SET
      "companyId" = COALESCE(NULLIF(o."companyId",'')::uuid, o.company_id),
      "clientId" = COALESCE(NULLIF(o."clientId",'')::uuid, o.customer_id),
      "createdById" = COALESCE(NULLIF(o."createdById",'')::uuid, o.created_by_id)
  `;
  try {
    const r = await c.query(q);
    console.log('UPDATE OK', r.rowCount);
  } catch (e) {
    console.log('FAIL', e.message.split('\n')[0]);
  }
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });