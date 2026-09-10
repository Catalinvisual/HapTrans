const { Client } = require('pg');

async function checkCoords() {
  const client = new Client({
    connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway',
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    
    console.log('--- DRIVERS ---');
    const driversRes = await client.query(`
      SELECT d.id, u.name, d."currentLat", d."currentLng", d."lastSeen"
      FROM drivers d
      LEFT JOIN users u ON d."userId" = u.id
    `);
    console.log(driversRes.rows);
    
    console.log('\n--- TRUCKS ---');
    const trucksRes = await client.query(`
      SELECT id, "plateNumber", "currentLat", "currentLng"
      FROM trucks
    `);
    console.log(trucksRes.rows);
    
  } catch (err) {
    console.error('Error querying DB:', err.message);
  } finally {
    await client.end();
  }
}

checkCoords();
