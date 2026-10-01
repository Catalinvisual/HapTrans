const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway', ssl: { rejectUnauthorized: false } });
client.connect().then(() => client.query("SELECT min(created_at), max(created_at) FROM trips")).then(r => console.log(r.rows)).finally(() => client.end());
