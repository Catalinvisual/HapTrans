const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway', ssl: { rejectUnauthorized: false } });

async function shiftDates() {
  await client.connect();
  console.log('Connected to DB');

  const tables = ['trips', 'orders', 'pickup_stops', 'invoices'];
  for (const table of tables) {
    const colsRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND (data_type ILIKE '%timestamp%' OR data_type ILIKE '%date%')`, [table]);
    
    for (const row of colsRes.rows) {
      const col = row.column_name;
      if (col === 'deleted_at') continue;
      
      const updateQuery = `UPDATE "${table}" SET "${col}" = "${col}" + interval '20 days' WHERE "${col}" IS NOT NULL`;
      try {
        const res = await client.query(updateQuery);
        console.log(`Updated ${res.rowCount} rows for ${table}.${col}`);
      } catch (err) {
        console.error(`Error updating ${table}.${col}:`, err.message);
      }
    }
  }

  await client.end();
  console.log('Finished updating dates!');
}

shiftDates();
