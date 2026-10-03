const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: "postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway"
  });

  try {
    await client.connect();
    console.log("Connected to DB!");
    
    // Add missing enum values
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'documents_documenttype_enum' AND e.enumlabel = 'aviz') THEN
          ALTER TYPE "documents_documenttype_enum" ADD VALUE 'aviz';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'documents_documenttype_enum' AND e.enumlabel = 'fuel') THEN
          ALTER TYPE "documents_documenttype_enum" ADD VALUE 'fuel';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'documents_documenttype_enum' AND e.enumlabel = 'licence') THEN
          ALTER TYPE "documents_documenttype_enum" ADD VALUE 'licence';
        END IF;
      END $$;
    `);
    
    console.log("Enum values added successfully!");
  } catch (err) {
    console.error("Error executing query", err);
  } finally {
    await client.end();
  }
}

run();
