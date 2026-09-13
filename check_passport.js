const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway', ssl: { rejectUnauthorized: false } });

async function check() {
  await client.connect();
  const res = await client.query(`SELECT id, type, "expiryDate" FROM driver_documents WHERE type='passport'`);
  console.log(res.rows);
  const docs = await client.query(`SELECT id, type, "expiryDate" FROM driver_documents LIMIT 10`);
  console.log('Sample documents:', docs.rows);
  
  // Also check if drivers has any passport field
  const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='drivers'`);
  console.log('Driver columns:', cols.rows.map(r=>r.column_name).filter(c=>c.toLowerCase().includes('passport') || c.toLowerCase().includes('id_card')));

  await client.end();
}
check();
