const { Client } = require('pg');
const url = 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway';
async function main() {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const before = await c.query(`SELECT (SELECT COUNT(*) FROM order_stops) os, (SELECT COUNT(*) FROM cargo_items) ci`);
  console.log('before:', before.rows[0]);

  const r1 = await c.query(`
    DELETE FROM order_stops o
    WHERE o.id NOT IN (
      SELECT DISTINCT ON (s."orderId", s.type) s.id
      FROM order_stops s
      ORDER BY s."orderId", s.type, s."createdAt" ASC
    )`);
  console.log('deleted order_stops:', r1.rowCount);

  const r2 = await c.query(`
    DELETE FROM cargo_items ci
    WHERE ci.id NOT IN (
      SELECT DISTINCT ON (it."orderId") it.id
      FROM cargo_items it
      ORDER BY it."orderId", it."createdAt" ASC
    )`);
  console.log('deleted cargo_items:', r2.rowCount);

  const after = await c.query(`SELECT (SELECT COUNT(*) FROM order_stops) os, (SELECT COUNT(*) FROM cargo_items) ci`);
  console.log('after:', after.rows[0]);
  await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });