const { Client } = require('pg');
const url = 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway';
async function main() {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query('SELECT COUNT(*) c FROM orders WHERE "invoiceId" IS NOT NULL');
  console.log('orders.invoiceId set:', r.rows[0].c);
  const r2 = await c.query('SELECT COUNT(*) c FROM orders WHERE "tripId" IS NOT NULL');
  console.log('orders.tripId set:', r2.rows[0].c);
  const bad = await c.query('SELECT COUNT(*) c FROM orders o LEFT JOIN invoices i ON i.id=o."invoiceId" WHERE o."invoiceId" IS NOT NULL AND i.id IS NULL');
  console.log('orders with dangling invoiceId:', bad.rows[0].c);
  await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });