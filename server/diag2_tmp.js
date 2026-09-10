const { Client } = require('pg');
const url = 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway';

async function main() {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const q = async (label, sql) => {
    try {
      const r = await c.query(sql);
      console.log(`== ${label} ==`);
      console.log(JSON.stringify(r.rows, null, 1));
    } catch (e) { console.log(`== ${label} == ERR: ${e.message}`); }
  };

  await q('orders.status distinct', `SELECT status, COUNT(*) FROM orders GROUP BY status ORDER BY 2 DESC`);
  await q('trips.status distinct', `SELECT status, COUNT(*) FROM trips GROUP BY status ORDER BY 2 DESC`);
  await q('invoices.status distinct', `SELECT status, COUNT(*) FROM invoices GROUP BY status ORDER BY 2 DESC`);
  await q('payments.method distinct', `SELECT method, COUNT(*) FROM payments GROUP BY method ORDER BY 2 DESC`);
  await q('drivers.status distinct', `SELECT status, COUNT(*) FROM drivers GROUP BY status ORDER BY 2 DESC`);
  await q('vehicles.status distinct', `SELECT status, COUNT(*) FROM vehicles GROUP BY status ORDER BY 2 DESC`);
  await q('users.status distinct', `SELECT status, COUNT(*) FROM users GROUP BY status ORDER BY 2 DESC`);

  await q('service_types', `SELECT * FROM service_types`);
  await q('cargo_types', `SELECT * FROM cargo_types`);
  await q('transport_modes', `SELECT * FROM transport_modes`);
  await q('vehicle_types', `SELECT * FROM vehicle_types`);
  await q('trailer_types', `SELECT * FROM trailer_types`);
  await q('companies columns', `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='companies' ORDER BY ordinal_position`);

  await q('entities/trips companiesId rows', `SELECT COUNT(*) total, COUNT("companyId") has_company FROM trips`);
  await q('users sample', `SELECT id, email, first_name, last_name, status, "companyId", "name", "role", "password", LENGTH(COALESCE("password",'')) pwlen FROM users`);

  await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });