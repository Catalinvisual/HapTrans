import { Client } from 'pg';

async function fixDb() {
  const client = new Client({
    host: 'containers-us-west-123.railway.app',
    port: 5432,
    user: 'postgres',
    password: 'ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK',
    database: 'railway',
    ssl: false
  });

  try {
    await client.connect();
    console.log('Connected to Railway DB');

    // Add version column with default 1
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='version') THEN
          ALTER TABLE trips ADD COLUMN version int DEFAULT 1 NOT NULL;
        END IF;
      END
      $$;
    `);

    console.log('Successfully fixed trips table version column');
  } catch (err) {
    console.error('Error fixing DB:', err);
  } finally {
    await client.end();
  }
}

fixDb();
