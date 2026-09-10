const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  await c.connect();
  const q = async (sql, p = []) => (await c.query(sql, p)).rows;

  const cols = await q(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders' ORDER BY ordinal_position`);
  console.log('ORDERS COLS', JSON.stringify(cols));

  const tripLink = await q(`SELECT COUNT(*) FILTER (WHERE "tripId" IS NOT NULL) with_trip, COUNT(*) FILTER (WHERE "tripId" IS NULL) without_trip FROM orders`);
  console.log('ORDERS tripId', JSON.stringify(tripLink));

  const tripOrders = await q(`SELECT o."tripId", COUNT(*) FILTER (WHERE os.country IS NOT NULL AND os.country<>'') stops_with_country
    FROM orders o JOIN order_stops os ON os."orderId" = o.id
    WHERE o."tripId" IS NOT NULL GROUP BY o."tripId" LIMIT 5`);
  console.log('TRIP-ORDER-STOPS join', JSON.stringify(tripOrders));

  const stopsTable1 = await q(`SELECT COUNT(*) FROM stops`);
  console.log('STOPS count', JSON.stringify(stopsTable1));

  await c.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });