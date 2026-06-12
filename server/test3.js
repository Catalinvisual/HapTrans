const { Client } = require('pg');
const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Laptophp20242019.',
  database: 'hapcargo',
});
client.connect().then(() => {
  return client.query('SELECT id, "plateNumber", "currentLat", "currentLng" FROM trucks');
}).then((res) => {
  console.log('Trucks:', res.rows);
  return client.query('SELECT id, "currentLat", "currentLng" FROM drivers');
}).then((res) => {
  console.log('Drivers:', res.rows);
  client.end();
}).catch(console.error);
