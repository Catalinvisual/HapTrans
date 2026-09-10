const { Client } = require('pg');
const url = 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway';
async function main() {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  console.log('companies:', JSON.stringify((await c.query('SELECT * FROM companies')).rows, null, 1));
  console.log('users:', JSON.stringify((await c.query('SELECT id, email, name, role, "isActive", "password" IS NOT NULL AS has_pw, status FROM users')).rows, null, 1));
  const nulls = await c.query(`SELECT COUNT(*) c FROM companies WHERE name IS NULL OR name=''`);
  console.log('companies empty name:', nulls.rows[0].c);
  const rel = await c.query(`SELECT conrelid::regclass AS tbl, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid='companies'::regclass`);
  console.log('companies constraints:', JSON.stringify(rel.rows));
  await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });