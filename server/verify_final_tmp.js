const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway', ssl: { rejectUnauthorized: false } });
  await c.connect();
  const checks = [
    ['companies', 'SELECT COUNT(*) c FROM companies'],
    ['clients', 'SELECT COUNT(*) c FROM clients'],
    ['trucks', 'SELECT COUNT(*) c FROM trucks'],
    ['orders', 'SELECT COUNT(*) c, COUNT("clientId") w, COUNT("createdById") x, COUNT("companyId") y FROM orders'],
    ['trips', 'SELECT COUNT(*) c, COUNT("truckId") w, COUNT("driverId") x FROM trips'],
    ['invoices', 'SELECT COUNT(*) c, COUNT("clientId") w, COUNT("issueDate") x FROM invoices'],
    ['payments', 'SELECT COUNT(*) c, COUNT("invoiceId") w FROM payments'],
    ['drivers', 'SELECT COUNT(*) c, COUNT("userId") w FROM drivers'],
    ['users', 'SELECT COUNT(*) c, COUNT("companyId") w FROM users'],
    ['order_stops', 'SELECT COUNT(*) c FROM order_stops'],
    ['cargo_items', 'SELECT COUNT(*) c FROM cargo_items'],
  ];
  for (const [name, q] of checks) {
    const r = await c.query(q);
    console.log(name, JSON.stringify(r.rows[0]));
  }
  const dup = await c.query(`SELECT COUNT(*) c FROM (SELECT "orderNumber" FROM orders GROUP BY "orderNumber" HAVING COUNT(*)>1) d`);
  console.log('dup orderNumber:', dup.rows[0].c);
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });