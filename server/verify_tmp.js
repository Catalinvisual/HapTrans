const { Client } = require('pg');
const url = 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway';
async function main() {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const q = async (l, sql) => { const r = await c.query(sql); console.log(l, JSON.stringify(r.rows[0])); };
  const bad = async (l, sql) => { const r = await c.query(sql); console.log(l, r.rows[0].c); };

  // counts
  await q('clients', `SELECT COUNT(*) c, COUNT("companyId") wco FROM clients`);
  await q('trucks', `SELECT COUNT(*) c, COUNT(status) ws FROM trucks`);
  await q('orders', `SELECT COUNT(*) c, COUNT("clientId") cid, COUNT("createdById") cb, COUNT(status) ws, COUNT("createdAt") cts FROM orders`);
  await q('trips', `SELECT COUNT(*) c, COUNT("truckId") tk, COUNT("driverId") dr, COUNT(status) ws FROM trips`);
  await q('invoices', `SELECT COUNT(*) c, COUNT("clientId") cid, COUNT("issueDate") id, COUNT(status) ws FROM invoices`);
  await q('payments', `SELECT COUNT(*) c, COUNT("invoiceId") iid FROM payments`);
  await q('drivers', `SELECT COUNT(*) c, COUNT("userId") uid FROM drivers`);
  await q('users', `SELECT COUNT(*) c FROM users`);

  // dangling refs
  await bad('orders without client', `SELECT COUNT(*) c FROM orders o LEFT JOIN clients cl ON cl.id=o."clientId" WHERE o."clientId" IS NOT NULL AND cl.id IS NULL`);
  await bad('trips without truck', `SELECT COUNT(*) c FROM trips t LEFT JOIN trucks tr ON tr.id=t."truckId" WHERE t."truckId" IS NOT NULL AND tr.id IS NULL`);
  await bad('trips without driver', `SELECT COUNT(*) c FROM trips t LEFT JOIN drivers d ON d.id=t."driverId" WHERE t."driverId" IS NOT NULL AND d.id IS NULL`);
  await bad('invoices without client', `SELECT COUNT(*) c FROM invoices i LEFT JOIN clients cl ON cl.id=i."clientId" WHERE i."clientId" IS NOT NULL AND cl.id IS NULL`);
  await bad('payments without invoice', `SELECT COUNT(*) c FROM payments p LEFT JOIN invoices i ON i.id=p."invoiceId" WHERE p."invoiceId" IS NOT NULL AND i.id IS NULL`);
  await bad('drivers without user', `SELECT COUNT(*) c FROM drivers d LEFT JOIN users u ON u.id=d."userId" WHERE d."userId" IS NOT NULL AND u.id IS NULL`);
  await bad('order_stops no order', `SELECT COUNT(*) c FROM order_stops s LEFT JOIN orders o ON o.id=s."orderId" WHERE s."orderId" IS NOT NULL AND o.id IS NULL`);
  await bad('cargo no order', `SELECT COUNT(*) c FROM cargo_items ci LEFT JOIN orders o ON o.id=ci."orderId" WHERE ci."orderId" IS NOT NULL AND o.id IS NULL`);

  // duplicates that would break unique constraints at boot
  await bad('dup orderNumber', `SELECT COUNT(*) c FROM (SELECT "orderNumber" FROM orders WHERE "orderNumber" IS NOT NULL GROUP BY "orderNumber" HAVING COUNT(*)>1) x`);
  await bad('dup tripNumber', `SELECT COUNT(*) c FROM (SELECT "tripNumber" FROM trips WHERE "tripNumber" IS NOT NULL GROUP BY "tripNumber" HAVING COUNT(*)>1) x`);
  await bad('dup invoiceNumber', `SELECT COUNT(*) c FROM (SELECT "invoiceNumber" FROM invoices WHERE "invoiceNumber" IS NOT NULL GROUP BY "invoiceNumber" HAVING COUNT(*)>1) x`);
  await bad('dup user email', `SELECT COUNT(*) c FROM (SELECT email FROM users GROUP BY email HAVING COUNT(*)>1) x`);

  // status distribution
  await q('orders statuses', `SELECT status, COUNT(*) c FROM orders GROUP BY status ORDER BY c DESC LIMIT 12`);
  await q('trips statuses', `SELECT status, COUNT(*) c FROM trips GROUP BY status ORDER BY c DESC LIMIT 12`);
  await q('invoices statuses', `SELECT status, COUNT(*) c FROM invoices GROUP BY status ORDER BY c DESC`);

  // sample
  const s = await c.query(`SELECT o."orderNumber", o.status, o."clientId", cl.name AS client, o."originalEtaPickup", o."createdAt", o."transportType" FROM orders o LEFT JOIN clients cl ON cl.id=o."clientId" LIMIT 3`);
  console.log('sample orders:', JSON.stringify(s.rows, null, 1));
  const t = await c.query(`SELECT t."tripNumber", t.status, t."truckId", tr."plateNumber", t."driverId", d.first_name, t."plannedDeparture", t."distanceKm" FROM trips t LEFT JOIN trucks tr ON tr.id=t."truckId" LEFT JOIN drivers d ON d.id=t."driverId" LIMIT 3`);
  console.log('sample trips:', JSON.stringify(t.rows, null, 1));
  await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });