const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  await c.connect();
  const q = async (sql, p = []) => (await c.query(sql, p)).rows;

  const cols = await q(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'order_stops' ORDER BY ordinal_position`);
  console.log('ORDER_STOPS COLS', JSON.stringify(cols));

  const osSample = await q(`SELECT * FROM order_stops LIMIT 3`);
  console.log('ORDER_STOPS SAMPLE', JSON.stringify(osSample, null, 0).slice(0, 1500));

  const osCountries = await q(`SELECT country, COUNT(*) n FROM order_stops WHERE country IS NOT NULL AND country <> '' GROUP BY country ORDER BY n DESC LIMIT 20`);
  console.log('ORDER_STOPS COUNTRIES', JSON.stringify(osCountries));

  const tripsWithStops = await q(`SELECT COUNT(DISTINCT trip_id) FROM order_stops WHERE trip_id IS NOT NULL`);
  console.log('ORDER_STOPS trip_id fill', JSON.stringify(tripsWithStops));

  const cargoCountries = await q(`SELECT column_name FROM information_schema.columns WHERE table_name='cargo_items'`);
  console.log('CARGO COLS', JSON.stringify(cargoCountries));

  await c.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });