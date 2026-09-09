const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway' });

client.connect().then(async () => {
  const cols = await client.query('SELECT "plateNumber", "companyId" FROM trucks');
  console.log('Trucks:', cols.rows);
}).finally(() => client.end());
