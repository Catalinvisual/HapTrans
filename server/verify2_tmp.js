const { Client } = require('pg');
const url = 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway';
async function main() {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(`SELECT "invoiceNumber", COUNT(*) c FROM invoices GROUP BY "invoiceNumber" HAVING COUNT(*)>1`);
  console.log('dup invoices:', JSON.stringify(r.rows));
  const r2 = await c.query(`SELECT invoice_number, COUNT(*) c FROM invoices GROUP BY invoice_number HAVING COUNT(*)>1`);
  console.log('dup legacy invoice_number:', JSON.stringify(r2.rows));
  const r3 = await c.query(`SELECT COUNT(*) total, COUNT(order_number) withON FROM orders`);
  console.log(r3.rows);
  const r4 = await c.query(`SELECT order_number, COUNT(*) c FROM orders GROUP BY order_number HAVING COUNT(*)>1 LIMIT 5`);
  console.log('dup order_number:', JSON.stringify(r4.rows));
  const r5 = await c.query(`SELECT COUNT(*) c FROM orders WHERE "orderNumber" IS NULL`);
  console.log('orders with null camel orderNumber:', r5.rows);
  const r6 = await c.query(`SELECT COUNT(*) c FROM invoices WHERE "invoiceNumber" IS NULL`);
  console.log('invoices null camel invoiceNumber:', r6.rows);
  const r7 = await c.query(`SELECT COUNT(*) c FROM invoices WHERE invoice_number IS NULL`);
  console.log('invoices null legacy invoice_number:', r7.rows);
  await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });