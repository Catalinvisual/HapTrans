const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway', ssl: { rejectUnauthorized: false } });

async function fix() {
  await client.connect();
  
  const tables = ['driver_documents', 'truck_documents', 'trailers', 'drivers', 'client_rates'];
  
  for (const table of tables) {
    const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name=$1 AND (column_name ILIKE '%expir%' OR column_name ILIKE '%until%' OR data_type ILIKE '%date%')`, [table]);
    
    for (const c of cols.rows) {
      const col = c.column_name;
      try {
        // Let's just update anything that is 2025 or 2026 to 2028 or 2029
        const query = `
          UPDATE "${table}" 
          SET "${col}" = TIMESTAMP '2028-01-01' + random() * (TIMESTAMP '2030-12-31' - TIMESTAMP '2028-01-01')
          WHERE "${col}"::text LIKE '2025-%' OR "${col}"::text LIKE '2026-%'
        `;
        const res = await client.query(query);
        if (res.rowCount > 0) {
          console.log(`Updated ${res.rowCount} rows in ${table}.${col}`);
        }
      } catch(e) {
        // ignore cast errors
      }
    }
  }

  console.log('Done fixing old dates');
  await client.end();
}
fix();
