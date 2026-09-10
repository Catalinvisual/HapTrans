const { Client } = require('pg');

async function checkToken() {
  const client = new Client({
    connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway',
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    const res = await client.query('SELECT * FROM messages ORDER BY "createdAt" DESC LIMIT 1');
    console.log(res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

checkToken();
