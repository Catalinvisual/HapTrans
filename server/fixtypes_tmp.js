const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway', ssl: { rejectUnauthorized: false } });
  await c.connect();
  const fixes = [
    ['vehicles', 'year', 'integer'],
    ['vehicles', 'fuel_consumption_l100km', 'numeric'],
    ['vehicles', 'odometer_km', 'numeric'],
    ['vehicles', 'payload_kg', 'numeric'],
    ['vehicles', 'volume_m3', 'numeric'],
    ['customers', 'credit_limit', 'numeric'],
    ['vehicles', 'status', 'character varying'],
  ];
  for (const [t, col, type] of fixes) {
    try {
      await c.query(`ALTER TABLE "${t}" ALTER COLUMN "${col}" TYPE ${type} USING CASE WHEN "${col}" = '' THEN NULL ELSE "${col}"::${type} END`);
      console.log('OK', t, col, type);
    } catch (e) {
      console.log('SKIP', t, col, e.message.split('\n')[0]);
    }
  }
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });