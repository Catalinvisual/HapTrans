const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway', ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  
  const KEY_TABLES = ['clients','customers','drivers','trucks','trailers','trips','orders','invoices','invoice_items','expenses','payments','maintenance','payrolls','shipments','stops','order_stops','trip_costs','settlements','leads','cargo_items','driver_documents','truck_documents','client_locations','client_rates','notifications','customer_contacts','customer_locations','customer_tags','customer_tag_assignments'];
  
  for (const t of KEY_TABLES) {
    const cols = await client.query(`SELECT column_name, data_type, udt_name, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, [t]);
    if (cols.rows.length === 0) { console.log(`TABLE_NOT_FOUND: ${t}`); continue; }
    const count = await client.query(`SELECT COUNT(*) FROM "${t}"`);
    console.log(`\nTABLE:${t}:${count.rows[0].count}`);
    cols.rows.forEach(c => console.log(`  COL:${c.column_name}|${c.data_type}|${c.udt_name}|nullable:${c.is_nullable}|default:${c.column_default||''}`));
  }

  // Get enums
  const enumRes = await client.query(`SELECT t.typname, e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid ORDER BY t.typname, e.enumsortorder`);
  const enums = {};
  enumRes.rows.forEach(r => { if(!enums[r.typname]) enums[r.typname]=[]; enums[r.typname].push(r.enumlabel); });
  console.log('\nENUMS:' + JSON.stringify(enums));

  // FK constraints  
  const fks = await client.query(`SELECT tc.table_name, kcu.column_name, ccu.table_name AS ftable, ccu.column_name AS fcol FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name=tc.constraint_name WHERE tc.constraint_type='FOREIGN KEY' ORDER BY tc.table_name, kcu.column_name`);
  console.log('\nFOREIGN_KEYS:');
  fks.rows.forEach(r => console.log(`  FK:${r.table_name}.${r.column_name}->${r.ftable}.${r.fcol}`));

  await client.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
