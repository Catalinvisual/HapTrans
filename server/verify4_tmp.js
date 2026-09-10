const { Client } = require('pg');
const url = 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway';
async function main() {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(`SELECT COUNT(*) total, COUNT(order_id) withoid, COUNT(NULLIF(TRIM(order_id::text),'')) wnz FROM invoices`);
  console.log('invoices order_id:', r.rows[0]);
  const r2 = await c.query(`SELECT o.id FROM invoices i LEFT JOIN orders o ON o.id = i.order_id WHERE i.order_id IS NOT NULL LIMIT 5`);
  console.log('sample matches:', JSON.stringify(r2.rows));
  const r3 = await c.query(`SELECT COUNT(*) c FROM invoices i LEFT JOIN orders o ON o.id = i.order_id WHERE i.order_id IS NOT NULL AND o.id IS NULL`);
  console.log('unmatched:', r3.rows[0].c);
  const r4 = await c.query(`SELECT COUNT(*) c FROM orders o LEFT JOIN invoices i ON i.order_id = o.id WHERE i.id IS NOT NULL`);
  console.log('orders with an invoice by legacy link:', r4.rows[0].c);
  const r5 = await c.query(`SELECT order_id, customer_id, created_by_id FROM invoices LIMIT 3`);
  console.log('sample invoice legacy:', JSON.stringify(r5.rows));
  await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });