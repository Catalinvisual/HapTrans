const { Client } = require('pg');
const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Laptophp20242019.',
  database: 'haptrans',
});
client.connect().then(() => {
  return client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
}).then((res) => {
  console.log('Tables:', res.rows);
  client.end();
}).catch(console.error);
