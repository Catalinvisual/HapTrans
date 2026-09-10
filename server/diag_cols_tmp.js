const { Client } = require('pg');

const url = 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway';

async function main() {
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const tables = ['trips', 'orders', 'users', 'trucks', 'vehicles', 'clients', 'customers', 'drivers', 'invoices', 'payments'];

  for (const t of tables) {
    let total, cols;
    try {
      const r = await client.query(`SELECT COUNT(*) c FROM "${t}"`);
      total = r.rows[0].c;
      const c = await client.query(`
        SELECT column_name, data_type FROM information_schema.columns
        WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, [t]);
      cols = c.rows;
    } catch (e) {
      console.log(`==== ${t} :: ERROR :: ${e.message}`);
      continue;
    }
    console.log(`==== ${t} :: total rows = ${total}`);
    for (const col of cols) {
      try {
        const nr = await client.query(`SELECT COUNT("${col.column_name}") c FROM "${t}"`);
        console.log(`   ${col.column_name.padEnd(24)} ${col.data_type.padEnd(16)} nonnull=${nr.rows[0].c}`);
      } catch (e) {
        console.log(`   ${col.column_name.padEnd(24)} ERR: ${e.message}`);
      }
    }
  }

  console.log('\n==== SAMPLE trips ====');
  try {
    const r = await client.query(`SELECT * FROM "trips" LIMIT 2`);
    console.log(JSON.stringify(r.rows, null, 1));
  } catch (e) { console.log('ERR ' + e.message); }

  console.log('\n==== SAMPLE orders ====');
  try {
    const r = await client.query(`SELECT * FROM "orders" LIMIT 2`);
    console.log(JSON.stringify(r.rows, null, 1));
  } catch (e) { console.log('ERR ' + e.message); }

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });