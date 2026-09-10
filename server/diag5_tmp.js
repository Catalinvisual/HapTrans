const { Client } = require('pg');
const url = 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway';
async function main() {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const cols = await c.query(`
    SELECT t1.relname AS tbl, a.attname AS col, t2.typname AS enumtype
    FROM pg_attribute a
    JOIN pg_class t1 ON t1.oid = a.attrelid
    JOIN pg_type t2 ON t2.oid = a.atttypid
    WHERE t1.relname IN ('drivers','invoices','payments','trucks','users','vehicles','customers')
      AND t1.relname NOT LIKE 'pg%'
      AND a.atttypid IN (SELECT oid FROM pg_type WHERE typtype='e')
      AND NOT a.attisdropped
    ORDER BY t1.relname, a.attname`);
  for (const col of cols.rows) {
    const labels = await c.query(`SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname=$1) ORDER BY enumsortorder`, [col.enumtype]);
    console.log(`${col.tbl}.${col.col} :: ${col.enumtype} = [${labels.rows.map(r => r.enumlabel).join(', ')}]`);
  }
  console.log('\n--- current stored values ---');
  const q = async (l, sql) => { const r = await c.query(sql); console.log(l, JSON.stringify(r.rows)); };
  await q('invoices.status', `SELECT DISTINCT status FROM invoices`);
  await q('payments.method', `SELECT DISTINCT method FROM payments`);
  await q('drivers.status', `SELECT DISTINCT status FROM drivers`);
  await q('users.status', `SELECT DISTINCT status FROM users`);
  await q('vehicles.status', `SELECT DISTINCT status FROM vehicles`);
  await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });