const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway', ssl: { rejectUnauthorized: false } });
  await c.connect();
  for (const t of ['orders', 'invoices', 'payments', 'trips']) {
    const r = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position`, [t]);
    console.log(`\n== ${t} ==`);
    for (const row of r.rows) console.log('  ', row.column_name, row.data_type);
  }
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });