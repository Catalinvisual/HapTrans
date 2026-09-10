const { Client } = require('pg');
const url = 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway';
async function main() {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const cols = ['orders.status','orders.transportType','orders.priority','trips.status','users.role','users.status','drivers.payMode','invoices.currency','payments.status','companies.isActive','order_stops.type',
    'order_stops.sequence','cargo_items.unit','customers.status','vehicles.status','customers.is_active','vehicles.is_active'];
  for (const t of cols) {
    const [tbl, col] = t.split('.');
    const r = await c.query(`SELECT data_type, udt_name FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`, [tbl, col]);
    const row = r.rows[0];
    let info = row ? `${row.data_type} (${row.udt_name})` : 'MISSING';
    if (row && row.data_type === 'USER-DEFINED') {
      const en = await c.query(`SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT t.oid FROM pg_type t WHERE t.typname=$1)`, [row.udt_name]);
      info += ` = [${en.rows.map(r=>r.enumlabel).join(', ')}]`;
    }
    console.log(`${t} :: ${info}`);
  }
  await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });