const { Client } = require('pg');
const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Laptophp20242019.',
  database: 'hapcargo',
});
client.connect().then(() => {
  return client.query('SELECT id, status, "truckId", "driverId" FROM trips');
}).then((res) => {
  console.log('Trips:', res.rows);
  client.end();
}).catch(console.error);
