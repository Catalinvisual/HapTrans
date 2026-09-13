const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway', ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  
  // Functie Postgres pentru date viitoare aleatorii
  // Setam expirarea intre anul 2027 si 2030 (asiguram ca sunt toate in viitor fata de sept 2026)
  const randomFutureDate = `TIMESTAMP '2027-01-01' + random() * (TIMESTAMP '2030-12-31' - TIMESTAMP '2027-01-01')`;
  
  // 1. driver_documents (expiryDate)
  await client.query(`UPDATE driver_documents SET "expiryDate" = DATE(${randomFutureDate}) WHERE "expiryDate" < '2027-01-01'`);
  
  // 2. truck_documents (expiryDate)
  await client.query(`UPDATE truck_documents SET "expiryDate" = DATE(${randomFutureDate}) WHERE "expiryDate" < '2027-01-01'`);
  
  // 3. trailers (apkExpiry)
  await client.query(`UPDATE trailers SET "apkExpiry" = DATE(${randomFutureDate}) WHERE "apkExpiry" < '2027-01-01'`);
  
  // 4. drivers (license_expiry, licenseExpiry, medicalExpiry, tachoCardExpiry)
  // Pentru text/string columns (daca exista asa in schema) vs timestamp
  await client.query(`
    UPDATE drivers 
    SET 
      license_expiry = ${randomFutureDate},
      "licenseExpiry" = to_char(${randomFutureDate}, 'YYYY-MM-DD'),
      "medicalExpiry" = to_char(${randomFutureDate}, 'YYYY-MM-DD'),
      "tachoCardExpiry" = to_char(${randomFutureDate}, 'YYYY-MM-DD')
  `);

  console.log('✅ Toate documentele, ITP-urile și licențele au fost prelungite (vor expira între 2027 și 2030).');
  
  await client.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
