const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway', ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(`SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name='vehicles' ORDER BY ordinal_position`);
  for (const row of r.rows) console.log(row.column_name, row.data_type, row.column_default || '');
  const s = await c.query(`SELECT payload_kg, odometer_km, fuel_consumption_l100km, volume_m3 FROM vehicles LIMIT 5`);
  console.log(JSON.stringify(s.rows, null, 1));
  const t = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='trucks' AND column_name IN ('companyId','plateNumber','payloadCapacity','maxWeightKg','maxLdm','maxVolumeCbm','maxPallets','totalMileage','fuelConsumption','currentLat','currentLng','year') ORDER BY ordinal_position`);
  console.log('TRUCKS cols:', JSON.stringify(t.rows));
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });