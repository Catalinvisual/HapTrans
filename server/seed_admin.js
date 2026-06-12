const { Client } = require('pg');
const bcrypt = require('bcrypt');

const dbUrl = 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway';

async function seedAdmin() {
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    const email = 'admin@hapcargo.com';
    const password = 'Haplogic2019.';
    const name = 'Admin';
    const role = 'admin';

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const query = `
      INSERT INTO "users" (email, password, name, role, "isActive", "createdAt", "updatedAt") 
      VALUES ($1, $2, $3, $4, true, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role;
    `;
    
    await client.query(query, [email, hashedPassword, name, role]);
    console.log('Admin user successfully created or updated!');

  } catch (error) {
    console.error('Error seeding admin:', error);
  } finally {
    await client.end();
  }
}

seedAdmin();
