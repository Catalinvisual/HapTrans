const { Client } = require('pg');

const client = new Client({
  host: 'containers-us-west-123.railway.app',
  port: 5432,
  user: 'postgres',
  password: 'ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK',
  database: 'railway'
});

client.connect()
  .then(() => client.query('SELECT id, "referenceNumber", "trackingToken" FROM trips LIMIT 5;'))
  .then(res => {
    console.log(JSON.stringify(res.rows, null, 2));
    return client.end();
  })
  .catch(console.error);
