const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway' });

client.connect().then(async () => {
  const ordersRes = await client.query('SELECT id, "orderNumber", "tripId", status FROM orders ORDER BY "createdAt" DESC LIMIT 10');
  console.log('Recent orders:', ordersRes.rows);
}).finally(() => client.end());
