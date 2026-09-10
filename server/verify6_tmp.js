const { Client } = require('pg');
const url = 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway';
async function main() {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  for (const t of ['users', 'companies']) {
    const r = await c.query(`SELECT column_name, column_default, is_nullable, data_type FROM information_schema.columns WHERE table_name=$1 AND column_name='id'`, [t]);
    console.log(t, 'id:', JSON.stringify(r.rows));
  }
  const gen = await c.query(`SELECT gen_random_uuid()`);
  console.log('gen_random_uuid ok:', gen.rows[0].gen_random_uuid);
  await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });