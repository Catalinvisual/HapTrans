const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway', ssl: { rejectUnauthorized: false } });
  await c.connect();
  const tables = await c.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`);
  console.log('TABLES', tables.rows.map(r => r.tablename).join(', '));
  for (const t of tables.rows) {
    const r = await c.query(`SELECT count(*) AS n FROM "${t.tablename}"`);
    console.log(t.tablename, r.rows[0].n);
  }
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });