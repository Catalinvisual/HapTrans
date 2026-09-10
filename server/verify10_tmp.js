const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway', ssl: { rejectUnauthorized: false } });
  await c.connect();
  for (const t of ['orders', 'trips', 'invoices', 'payments', 'drivers', 'customers', 'companies', 'users']) {
    const cols = (await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1`, [t])).rows;
    const show = cols.filter(r => r.data_type === 'text' && /_id$|_by$|^id$|Id$|By$|_id$/.test(r.column_name));
    const sample = show.length
      ? (await c.query(`SELECT "${show.slice(0,3).map(x=>x.column_name).join('","')}" FROM "${t}" LIMIT 3`)).rows
      : [];
    console.log(t, '->', JSON.stringify(show));
  }
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });