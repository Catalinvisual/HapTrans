require('reflect-metadata');
const { DataSource } = require('typeorm');
const path = require('path');

function pgTypeFor(t) {
  const s = String(t).toLowerCase();
  if (s.includes('uuid')) return 'uuid';
  if (s.includes('json')) return 'jsonb';
  if (s.includes('int') || s.includes('numeric') || s.includes('decimal') || s.includes('float') || s.includes('real') || s.includes('double') || s.includes('money')) return 'numeric';
  if (s.includes('timestamp') || s.includes('datetime') || s.includes('date') || s.includes('time')) return 'timestamp';
  if (s.includes('varchar') || s.includes('char') || s.includes('text') || s.includes('string') || s.includes('enum')) return 'character varying';
  if (s === 'boolean' || s === 'bool') return 'boolean';
  return 'character varying';
}
function backfillExpr(t, type) {
  const s = String(t).toLowerCase();
  if (s === 'bool' || s.includes('boolean')) return 'false';
  if (s === 'uuid') return '"00000000-0000-0000-0000-000000000000"::uuid';
  if (s.includes('int') || s.includes('numeric') || s.includes('decimal') || s.includes('float') || s.includes('real') || s.includes('double') || s.includes('money')) return '0';
  if (s.includes('timestamp') || s.includes('datetime') || s.includes('date') || s.includes('time')) return 'now()';
  if (s.includes('json')) return "'{}'::jsonb";
  return "''";
}

(async () => {
  const ds = new DataSource({
    type: 'postgres',
    url: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway',
    ssl: { rejectUnauthorized: false },
    entities: [path.join(__dirname, 'dist/**/*.entity.js')],
    synchronize: false,
  });
  await ds.initialize();
  const MAX = 200;
  for (let attempt = 1; attempt <= MAX; attempt++) {
    try {
      await ds.synchronize();
      console.log('SYNC COMPLETE after attempts', attempt);
      break;
    } catch (e) {
      const msg = String(e.message);
      const m = /column "([^"]+)" of relation "([^"]+)" contains null values/.exec(msg);
      if (!m) { console.log('UNRECOVERABLE:', msg); break; }
      const [, colName, tableName] = m;
      const meta = ds.entityMetadatas.find(md => md.tableName === tableName);
      const col = meta?.columns.find(c => c.databaseName === colName);
      if (!meta || !col) { console.log(`NO META for ${tableName}.${colName}`); break; }
      const colType = typeof col.type === 'function'
        ? col.type === Number ? 'numeric' : col.type === Boolean ? 'boolean' : col.type === Date ? 'timestamp' : 'varchar'
        : String(col.type || 'varchar');
      const type = pgTypeFor(colType);
      await ds.query(`ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${colName}" ${type}`);
      const upd = await ds.query(`UPDATE "${tableName}" SET "${colName}" = ${backfillExpr(colType, type)} WHERE "${colName}" IS NULL`);
      console.log(`[${attempt}] healed ${tableName}.${colName} (${type}), rows updated ${upd[1]}`);
    }
  }
  await ds.destroy();
})().catch(e => { console.error(e); process.exit(1); });