const { Client } = require('pg');

const dbUrl = 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway';

async function updateDb() {
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    const result = await client.query(`UPDATE "users" SET email = REPLACE(email, 'haptrans.ro', 'hapcargo.ro') WHERE email LIKE '%haptrans.ro%'`);
    console.log('Updated ' + result.rowCount + ' users with haptrans.ro -> hapcargo.ro');

    const result2 = await client.query(`UPDATE "users" SET email = REPLACE(email, 'haptrans.com', 'hapcargo.com') WHERE email LIKE '%haptrans.com%'`);
    console.log('Updated ' + result2.rowCount + ' users with haptrans.com -> hapcargo.com');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

updateDb();
