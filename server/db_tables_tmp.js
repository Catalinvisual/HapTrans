const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway',
  ssl: { rejectUnauthorized: false },
});
async function main() {
  await client.connect();
  const tables = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`);
  console.log('=== TABLES ===');
  for (const t of tables.rows) {
    const count = await client.query(`SELECT COUNT(*)::int as c FROM "${t.tablename}"`);
    console.log(`${t.tablename}: ${count.rows[0].c} rows`);
  }
  await client.end();
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
