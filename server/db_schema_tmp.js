const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway',
  ssl: { rejectUnauthorized: false },
});
async function main() {
  await client.connect();
  const tables = ['users','trips','orders','trucks','vehicles','clients','customers','website_cms','quote_requests','quotes','leads','expenses','documents','notifications','drivers','companies','invoices','payments','trailers'];
  for (const t of tables) {
    const res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, [t]);
    console.log(`\n=== ${t} ===`);
    console.log(res.rows.map(r=>r.column_name).join(', '));
  }
  await client.end();
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
