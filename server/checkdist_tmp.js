const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  await c.connect();
  const q = async (sql, p = []) => (await c.query(sql, p)).rows;

  const orderStatus = await q(`SELECT status, COUNT(*) n FROM orders GROUP BY status ORDER BY n DESC`);
  console.log('ORDER STATUS', JSON.stringify(orderStatus));

  const tripStatus = await q(`SELECT status, COUNT(*) n FROM trips GROUP BY status ORDER BY n DESC`);
  console.log('TRIP STATUS', JSON.stringify(tripStatus));

  const stopCountries = await q(`SELECT country, COUNT(*) n FROM stops GROUP BY country ORDER BY n DESC LIMIT 15`);
  console.log('STOP COUNTRIES', JSON.stringify(stopCountries));

  const hasCountry = await q(`SELECT COUNT(*) FILTER (WHERE country IS NOT NULL AND country<>'') filled, COUNT(*) total FROM stops`);
  console.log('STOPS country fill', JSON.stringify(hasCountry));

  const otifSample = await q(`SELECT COUNT(*) FILTER (WHERE "plannedArrival" IS NOT NULL AND "actualArrival" IS NOT NULL AND "actualArrival" <= "plannedArrival") ontime,
    COUNT(*) FILTER (WHERE "plannedArrival" IS NOT NULL AND "actualArrival" IS NOT NULL) arrived,
    COUNT(*) FILTER (WHERE "plannedArrival" IS NOT NULL AND "actualArrival" IS NULL AND "plannedArrival" < now()) overdue FROM trips`);
  console.log('OTIF SAMPLE', JSON.stringify(otifSample));

  const tripCreated = await q(`SELECT date_trunc('month', "createdAt") m, COUNT(*) n FROM trips GROUP BY m ORDER BY m`);
  console.log('TRIP CREATED BY MONTH', JSON.stringify(tripCreated));

  const orderCreated = await q(`SELECT date_trunc('month', "createdAt") m, COUNT(*) n FROM orders GROUP BY m ORDER BY m`);
  console.log('ORDER CREATED BY MONTH', JSON.stringify(orderCreated));

  const orderTrips = await q(`SELECT COUNT(*) FILTER (WHERE trip_id IS NOT NULL) with_trip, COUNT(*) FILTER (WHERE trip_id IS NULL) without_trip FROM orders`);
  console.log('ORDERS with/without trip', JSON.stringify(orderTrips));

  const plannedSample = await q(`SELECT COUNT(*) FILTER (WHERE "plannedDeparture" IS NOT NULL) pd, COUNT(*) FILTER (WHERE "plannedArrival" IS NOT NULL) pa FROM trips`);
  console.log('TRIPS planned dates', JSON.stringify(plannedSample));

  const clientsCnt = await q(`SELECT COUNT(*) FROM clients`);
  console.log('CLIENTS', JSON.stringify(clientsCnt));

  await c.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });