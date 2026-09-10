const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const url = 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway';
const dir = 'C:/Users/hapen/AppData/Local/Temp/opencode/db_backup_20260910';

// Tables that are entity-owned and already recreated empty by TypeORM synchronize
const entityTables = new Set([
  'action_logs','cargo_items','client_locations','client_rates','clients','companies','contact_messages',
  'document_shares','documents','driver_documents','driver_hos','driver_tachograph_cards','drivers','expenses',
  'import_audits','invoice_items','invoices','job_applications','leads','maintenance','maintenance_attachments',
  'messages','notifications','order_stops','orders','payments','payrolls','planning_actions','planning_profiles',
  'planning_views','portal_users','quote_replies','quote_requests','route_plan_stops','sessions','settlements',
  'shipments','stop_tasks','stops','tachograph_activity_events','tachograph_live_state','tachographs',
  'telematics_devices','timeline_events','trailers','trip_costs','trips','truck_documents','truck_route_plans',
  'trucks','users','vehicle_live_state','website_cms',
]);

function inferType(values) {
  const present = values.filter(v => v !== null && v !== undefined);
  if (present.length === 0) return 'text';
  const allStr = present.every(v => typeof v === 'string');
  if (allStr) {
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (present.every(v => uuidRe.test(v))) return 'uuid';
    if (present.every(v => /^\{.*\}$|^\[.*\]$/.test(v) && (v.startsWith('{')||v.startsWith('[')))) return 'jsonb';
    if (present.every(v => /^\d{4}-\d{2}-\d{2}$/.test(v))) return 'date';
    if (present.every(v => !isNaN(Date.parse(v)) && /T|\d{2}:\d{2}/.test(v))) return 'timestamp';
    return 'text';
  }
  const allBool = present.every(v => typeof v === 'boolean');
  if (allBool) return 'boolean';
  if (present.every(v => typeof v === 'number')) {
    if (present.every(v => Number.isInteger(v))) return 'bigint';
    return 'numeric';
  }
  if (present.some(v => typeof v === 'object') || present.some(v => typeof v === 'object' && v !== null)) return 'jsonb';
  return 'text';
}

function colDefs(rows) {
  const keys = [];
  const keySet = new Set();
  for (const r of rows) for (const k of Object.keys(r)) if (!keySet.has(k)) { keySet.add(k); keys.push(k); }
  const defs = [];
  for (const k of keys) {
    const vals = rows.map(r => r[k]);
    let type = inferType(vals);
    if (k === 'id') type = 'uuid';
    defs.push({ name: k, type });
  }
  return defs;
}

async function main() {
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, '_manifest.json'), 'utf8'));
  await client.query('SET CONSTRAINTS ALL DEFERRED');
  for (const entry of manifest) {
    const file = path.join(dir, entry.file);
    let rows = [];
    try { rows = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.log(`skip ${entry.table}: ${e.message}`); continue; }
    if (!Array.isArray(rows)) rows = [];
    if (rows.length === 0 && entityTables.has(entry.table)) {
      console.log(`skip(recreate later) ${entry.table} (empty entity table)`);
      continue;
    }
    const defs = colDefs(rows);
    if (defs.length === 0) {
      // empty legacy table -> minimal stub
      await client.query(`DROP TABLE IF EXISTS "${entry.table}" CASCADE`);
      await client.query(`CREATE TABLE "${entry.table}" (id uuid)`);
      console.log(`stub ${entry.table} (empty legacy)`);
      continue;
    }
    await client.query(`DROP TABLE IF EXISTS "${entry.table}" CASCADE`);
    const cols = defs.map(d => `"${d.name}" ${d.type}`).join(', ');
    await client.query(`CREATE TABLE "${entry.table}" (${cols})`);
    // insert rows
    const names = defs.map(d => d.name);
    const q = `INSERT INTO "${entry.table}" ("${names.join('","')}") VALUES (${names.map((_, i) => '$' + (i + 1)).join(', ')})`;
    for (const r of rows) {
      const params = names.map(n => {
        const v = r[n];
        if (v === undefined) return null;
        if (typeof v === 'object' && v !== null) return JSON.stringify(v);
        return v;
      });
      try {
        await client.query(q, params);
      } catch (e) {
        console.log(`ROW FAIL ${entry.table}: ${e.message}`);
      }
    }
    console.log(`restored ${entry.table} (${rows.length} rows, cols=${names.length})`);
  }
  await client.end();
  console.log('RESTORE DONE');
}
main().catch(e => { console.error(e); process.exit(1); });