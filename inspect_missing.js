const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway', ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  let res;
  
  // DRIVERS
  res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='drivers'`);
  console.log('DRIVERS:', res.rows.map(x=>x.column_name).join(', '));
  
  res = await client.query(`SELECT * FROM drivers LIMIT 1`);
  console.log('DRIVERS DATA:', res.rows[0]);

  // TRIPS
  res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='trips'`);
  console.log('TRIPS:', res.rows.map(x=>x.column_name).join(', '));
  
  // ORDERS
  res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='orders'`);
  console.log('ORDERS:', res.rows.map(x=>x.column_name).join(', '));
  
  // UNASSIGNED ORDERS - What status do they have? Do they have a tripId?
  res = await client.query(`SELECT count(*), status FROM orders WHERE "tripId" IS NULL GROUP BY status`);
  console.log('UNASSIGNED ORDERS:', res.rows);

  await client.end();
}
run();
