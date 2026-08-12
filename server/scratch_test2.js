const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway' });

client.connect().then(async () => {
  const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='orders'");
  console.log('Columns in orders:', cols.rows.map(r => r.column_name));
}).finally(() => client.end());
