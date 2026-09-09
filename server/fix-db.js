const { Client } = require('pg');

const client = new Client({
  host: 'containers-us-west-123.railway.app',
  port: 5432,
  user: 'postgres',
  password: 'ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK',
  database: 'railway',
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to DB!');
    
    // Check if column exists
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='invoices' and column_name='draftReminderLevel';
    `);

    if (res.rows.length === 0) {
      console.log('Adding draftReminderLevel column...');
      await client.query('ALTER TABLE invoices ADD COLUMN "draftReminderLevel" integer NOT NULL DEFAULT 0;');
      console.log('Column added!');
    } else {
      console.log('Column already exists.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
