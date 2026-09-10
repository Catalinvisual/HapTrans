const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway', ssl: { rejectUnauthorized: false } });
  await c.connect();
  for (const [t, col] of [['orders','companyId'],['orders','clientId'],['orders','createdById'],['orders','company_id'],['orders','customer_id']]) {
    const r = await c.query(`
      SELECT id, "${col}"::text AS v, length("${col}"::text) AS len
      FROM "${t}" WHERE "${col}" IS NOT NULL
        AND "${col}"::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      LIMIT 3`);
    console.log(t, col, JSON.stringify(r.rows));
  }
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });