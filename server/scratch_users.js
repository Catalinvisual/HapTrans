const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway' });

client.connect().then(async () => {
  const cols = await client.query('SELECT id, email, "companyId", role FROM users LIMIT 5');
  console.log('Users:', cols.rows);
}).finally(() => client.end());
