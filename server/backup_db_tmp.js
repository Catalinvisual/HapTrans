const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const url = 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway';
const outDir = 'C:/Users/hapen/AppData/Local/Temp/opencode/db_backup_20260910';
fs.mkdirSync(outDir, { recursive: true });

async function main() {
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const tables = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT LIKE '%migration%' ORDER BY tablename`
  );

  const manifest = [];
  for (const row of tables.rows) {
    const t = row.tablename;
    try {
      const count = await client.query(`SELECT COUNT(*) c FROM "${t}"`);
      const data = await client.query(`SELECT * FROM "${t}"`);
      const file = `${t}.json`;
      fs.writeFileSync(path.join(outDir, file), JSON.stringify(data.rows, null, 1));
      manifest.push({ table: t, rows: parseInt(count.rows[0].c), file });
      console.log(`OK ${t} -> ${count.rows[0].c} rows`);
    } catch (e) {
      console.log(`FAIL ${t}: ${e.message}`);
    }
  }
  fs.writeFileSync(path.join(outDir, '_manifest.json'), JSON.stringify(manifest, null, 1));
  console.log('DONE. Backup in', outDir);
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });