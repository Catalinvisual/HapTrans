const { Client } = require('pg');
const url = 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway';
async function main() {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  for (const t of ['orders', 'users', 'drivers', 'companies']) {
    const r = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position`, [t]);
    console.log(`\n## ${t} (${r.rows.length})`);
    console.log(r.rows.map(x => x.column_name).join(', '));
  }
  const tt = await c.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('order_stops','stops','cargo_items')`);
  console.log('\nstop/cargo tables present:', tt.rows.map(r=>r.table_name).join(','));
  await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });