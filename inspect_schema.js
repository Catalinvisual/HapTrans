const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();

  // Check actual column names for drivers, trucks, trailers, clients, invoices, expenses, payments, maintenance, payrolls, shipments, leads
  const tables = ['drivers','trucks','trailers','clients','invoices','expenses','payments','maintenance','payrolls','shipments','leads','cargo_items'];
  for (const t of tables) {
    const cols = await client.query(`SELECT column_name, data_type, udt_name, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, [t]);
    const count = await client.query(`SELECT COUNT(*) FROM "${t}"`);
    console.log(`\n=== ${t} (${count.rows[0].count} rows) ===`);
    cols.rows.forEach(c => console.log(`  ${c.column_name} | ${c.data_type} | ${c.udt_name} | nullable:${c.is_nullable}`));
  }

  // Check FK constraints
  const fkRes = await client.query(`
    SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name IN ('drivers','trucks','trailers','clients','invoices','expenses','payments','maintenance','payrolls','shipments','leads')
    ORDER BY tc.table_name
  `);
  console.log('\n=== FOREIGN KEYS ===');
  fkRes.rows.forEach(r => console.log(`  ${r.table_name}.${r.column_name} -> ${r.foreign_table_name}.${r.foreign_column_name}`));

  await client.end();
}

main().catch(e => console.error(e));
