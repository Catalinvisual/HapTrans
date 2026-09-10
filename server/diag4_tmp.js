const { Client } = require('pg');
const url = 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway';
async function main() {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  for (const t of ['trips','orders','invoices','payments']) {
    const r = await c.query(`SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, [t]);
    console.log(`\n== ${t} ==`);
    for (const x of r.rows) console.log(' ', x.column_name, `(${x.data_type}/${x.udt_name})`);
  }
  // enum types used by legacy columns
  const en = await c.query(`SELECT t.typname, e.enumlabel, c.relname FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid JOIN pg_class c ON c.reltype=t.oid ORDER BY t.typname, e.enumsortorder`);
  console.log('\n== ALL ENUMS ==');
  for (const e of en.rows) console.log(' ', e.relname, '::', e.typname, '=', e.enumlabel);
  await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });