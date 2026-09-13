const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway',
  ssl: { rejectUnauthorized: false }
});

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min, max, dec = 2) { return parseFloat((Math.random() * (max - min) + min).toFixed(dec)); }
function randDate(start, end) {
  const s = new Date(start).getTime(), e = new Date(end).getTime();
  return new Date(s + Math.random() * (e - s));
}
function uuid() { return require('crypto').randomUUID(); }

const FIRST_NAMES = ['Alexandru','Andrei','Bogdan','Catalin','Daniel','Florin','Gabriel','Ion','Liviu','Marius','Mihai','Nicolae','Radu','Sebastian','Stefan','Vasile','Victor','Vlad','Adrian','Cristian'];
const LAST_NAMES = ['Popescu','Ionescu','Popa','Stan','Stoica','Gheorghe','Moldovan','Munteanu','Constantin','Dima','Florea','Dumitrescu','Badea','Niculescu','Serban','Preda','Nica','Draghici','Grigore','Matei'];
const COMPANIES = ['TransRo SRL','EuroTrans SA','CargoSpeed SRL','LogiRom SRL','FastFreight SRL','RomCargo SA','BalticTrans SRL','DunaTrans SRL','ExpresCargo SRL','PolyTrans SRL','AgriTrans SRL','TerraLogistics SRL','FlexiCargo SA','OmniFret SRL','TransCarpat SRL'];
const CITIES = ['București','Cluj-Napoca','Timișoara','Brașov','Constanța','Iași','Craiova','Galați','Ploiești','Oradea','Sibiu','Bacău','Arad','Pitești','Hamburg','München','Berlin','Frankfurt','Wien','Praga'];
const COUNTRIES = ['RO','DE','AT','CZ','PL','SK','HU','BG','NL','FR'];
const CARGO_NAMES = ['Mobilă','Produse alimentare','Materiale de construcții','Piese auto','Produse cosmetice','Textile','Echipamente electrice','Chimicale','Hârtie','Produse farmaceutice'];
const TRUCK_BRANDS = ['Volvo','Scania','Mercedes-Benz','DAF','MAN','Iveco','Renault'];
const TRAILER_MAKES = ['Schmitz','Krone','Kögel','Wielton','Fliegl','Renders'];
function phoneRO() { return '+407' + randInt(10,99) + randInt(100000,999999); }
function plateRO() {
  const counties = ['B','CJ','TM','BV','CT','IS','DJ','GL','PH','BH','SB','BC','AR','AG','MM'];
  return rand(counties) + randInt(10,99) + String.fromCharCode(65+randInt(0,25)) + String.fromCharCode(65+randInt(0,25)) + String.fromCharCode(65+randInt(0,25));
}
function vatRO() { return 'RO' + randInt(10000000,99999999); }

async function main() {
  await client.connect();
  console.log('✅ Connected');

  // --- Check current counts ---
  const tables = ['companies','drivers','trucks','trailers','trips','orders','clients','customers','stops','settlements','driver_documents','truck_documents','client_locations','client_rates','order_stops'];
  for (const t of tables) {
    const r = await client.query(`SELECT COUNT(*) FROM "${t}"`);
    console.log(`  ${t}: ${r.rows[0].count} rows`);
  }

  const companyRes = await client.query(`SELECT id FROM companies LIMIT 1`);
  const companyId = companyRes.rows[0]?.id;
  console.log('\nCompanyId:', companyId);

  // Get drivers, trucks, trips, orders, clients
  const driverIds = (await client.query(`SELECT id FROM drivers LIMIT 25`)).rows.map(r => r.id);
  const truckIds = (await client.query(`SELECT id FROM trucks LIMIT 25`)).rows.map(r => r.id);
  const trailerIds = (await client.query(`SELECT id FROM trailers LIMIT 25`)).rows.map(r => r.id);
  const tripIds = (await client.query(`SELECT id FROM trips LIMIT 25`)).rows.map(r => r.id);
  const orderIds = (await client.query(`SELECT id FROM orders LIMIT 25`)).rows.map(r => r.id);
  const clientIds = (await client.query(`SELECT id FROM clients LIMIT 25`)).rows.map(r => r.id);
  const customerIds = (await client.query(`SELECT id FROM customers LIMIT 25`)).rows.map(r => r.id);

  console.log(`Drivers: ${driverIds.length}, Trucks: ${truckIds.length}, Trailers: ${trailerIds.length}, Trips: ${tripIds.length}, Orders: ${orderIds.length}, Clients: ${clientIds.length}, Customers: ${customerIds.length}`);

  // ---- DRIVER DOCUMENTS (only if drivers exist) ----
  if (driverIds.length > 0) {
    console.log('\n📦 Inserting DRIVER DOCUMENTS...');
    const driverDocTypes = ['license','passport','medical_cert','adr_cert','cpc_cert','id_card','other'];
    for (let i = 0; i < 20; i++) {
      const driverId = driverIds[i % driverIds.length];
      try {
        await client.query(`
          INSERT INTO driver_documents (id, type, "documentNumber", "expiryDate", "fileUrl", "createdAt", "driverId")
          VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING
        `, [
          uuid(), rand(driverDocTypes),
          String.fromCharCode(65+randInt(0,25)) + String.fromCharCode(65+randInt(0,25)) + randInt(100000,999999),
          new Date(randDate('2025-01-01','2030-12-31')), null, new Date(), driverId
        ]);
      } catch(e) { console.log(`  ⚠️ driver_doc ${i}: ${e.message}`); }
    }
    console.log('  ✅ Done driver documents');
  }

  // ---- TRUCK DOCUMENTS (only if trucks exist) ----
  if (truckIds.length > 0) {
    console.log('\n📦 Inserting TRUCK DOCUMENTS...');
    const truckDocTypes = ['registration','insurance_rca','insurance_casco','vignette_ro','vignette_de','vignette_at','vignette_cz','itp','cmr_insurance','other'];
    for (let i = 0; i < 20; i++) {
      const truckId = truckIds[i % truckIds.length];
      try {
        await client.query(`
          INSERT INTO truck_documents (id, type, "documentNumber", "expiryDate", "fileUrl", "createdAt", "truckId")
          VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING
        `, [
          uuid(), rand(truckDocTypes),
          'DOC-' + randInt(100000,999999),
          new Date(randDate('2025-01-01','2030-12-31')), null, new Date(), truckId
        ]);
      } catch(e) { console.log(`  ⚠️ truck_doc ${i}: ${e.message}`); }
    }
    console.log('  ✅ Done truck documents');
  }

  // ---- CLIENT LOCATIONS ----
  if (clientIds.length > 0) {
    console.log('\n📦 Inserting CLIENT LOCATIONS...');
    for (let i = 0; i < 20; i++) {
      const clientId = clientIds[i % clientIds.length];
      const city = rand(CITIES);
      try {
        await client.query(`
          INSERT INTO client_locations (id, name, address, latitude, longitude, country, "contactPerson", phone, "timeZone", "createdAt", "updatedAt", "companyId", "clientId")
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT DO NOTHING
        `, [
          uuid(),
          city + ' - ' + rand(['Depozit Principal','Sediu Punct de Lucru','Rampa de Incarcare']),
          'Str. ' + rand(['Industriilor','Comercială','Logistică','Producției']) + ' nr.' + randInt(1,100),
          randFloat(43,55,4), randFloat(20,30,4),
          rand(COUNTRIES.slice(0,3)),
          rand(FIRST_NAMES) + ' ' + rand(LAST_NAMES),
          phoneRO(),
          rand(['Europe/Bucharest','Europe/Berlin','Europe/Warsaw']),
          new Date(), new Date(), companyId, clientId
        ]);
      } catch(e) { console.log(`  ⚠️ client_location ${i}: ${e.message}`); }
    }
    console.log('  ✅ Done client locations');
  }

  // ---- CLIENT RATES ----
  if (clientIds.length > 0) {
    console.log('\n📦 Inserting CLIENT RATES...');
    const vehicleTypes = ['mega','standard','frigo','walking_floor','flatbed'];
    const priceTypes = ['per_km','flat_rate','per_trip','per_hour'];
    for (let i = 0; i < 20; i++) {
      const clientId = clientIds[i % clientIds.length];
      const origCity = rand(CITIES);
      const destCity = rand(CITIES.filter(c => c !== origCity));
      const validFrom = randDate('2024-01-01','2025-06-01');
      const validUntil = new Date(validFrom.getTime() + 365 * 24 * 3600 * 1000);
      try {
        await client.query(`
          INSERT INTO client_rates (id, "rateName", "vehicleType", "priceType", "originCountry", "originCity", "destinationCountry", "destinationCity", "basePrice", currency, "fuelSurchargePercent", "tollIncluded", "validFrom", "validUntil", notes, active, "clientId")
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) ON CONFLICT DO NOTHING
        `, [
          uuid(),
          origCity + ' → ' + destCity + ' (' + rand(vehicleTypes) + ')',
          rand(vehicleTypes), rand(priceTypes),
          rand(COUNTRIES.slice(0,3)), origCity,
          rand(COUNTRIES.slice(0,5)), destCity,
          randFloat(500,5000,2), 'EUR',
          randFloat(3,15,1), Math.random() < 0.5,
          validFrom, validUntil,
          'Tarif negociat cu clientul. Valabil ' + rand(['1 an','6 luni','trimestrial']) + '.',
          true, clientId
        ]);
      } catch(e) { console.log(`  ⚠️ client_rate ${i}: ${e.message}`); }
    }
    console.log('  ✅ Done client rates');
  }

  // ---- ORDER STOPS ----
  if (orderIds.length > 0) {
    console.log('\n📦 Inserting ORDER STOPS...');
    for (let i = 0; i < 20; i++) {
      const orderId = orderIds[i % orderIds.length];
      const city = rand(CITIES);
      const dateFrom = randDate('2024-01-01','2026-09-01');
      const dateTo = new Date(dateFrom.getTime() + randInt(1,5) * 24 * 3600 * 1000);
      try {
        await client.query(`
          INSERT INTO order_stops (id, type, sequence, "companyName", address, latitude, longitude, country, city, "postalCode", "contactPerson", phone, "timeZone", "dateFrom", "dateTo", "timeFrom", "timeUntil", reference, notes, "createdAt", "updatedAt", "companyId", "orderId")
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) ON CONFLICT DO NOTHING
        `, [
          uuid(),
          rand(['pickup','delivery']),
          i + 1,
          rand(COMPANIES),
          'Str. ' + rand(['Industriilor','Comercială','Logistică']) + ' nr.' + randInt(1,100),
          randFloat(43,55,4), randFloat(20,30,4),
          rand(COUNTRIES), city,
          randInt(100000,999999).toString(),
          rand(FIRST_NAMES) + ' ' + rand(LAST_NAMES),
          phoneRO(),
          rand(['Europe/Bucharest','Europe/Berlin','Europe/Warsaw','Europe/Vienna']),
          dateFrom, dateTo,
          rand(['08:00','09:00','10:00','11:00']),
          rand(['16:00','17:00','18:00','19:00']),
          'REF-' + randInt(10000,99999),
          'Acces TIR. Notificare obligatorie cu 2h înainte de sosire.',
          new Date(), new Date(), companyId, orderId
        ]);
      } catch(e) { console.log(`  ⚠️ order_stop ${i}: ${e.message}`); }
    }
    console.log('  ✅ Done order stops');
  }

  // ---- SETTLEMENTS UPDATE (with driver IDs) ----
  if (driverIds.length > 0) {
    const settCount = (await client.query(`SELECT COUNT(*) FROM settlements`)).rows[0].count;
    if (parseInt(settCount) < 20) {
      console.log('\n📦 Updating SETTLEMENTS with driver IDs...');
      const settStatuses = ['draft','approved','paid'];
      for (let i = 0; i < 20; i++) {
        const driverId = driverIds[i % driverIds.length];
        const driverName = rand(FIRST_NAMES) + ' ' + rand(LAST_NAMES);
        const year = rand([2024,2025,2026]);
        const month = randInt(1,12);
        const gross = randFloat(3000,8000,2);
        const advances = randFloat(0,500,2);
        const deductions = randFloat(0,300,2);
        const netPay = gross - advances - deductions;
        try {
          await client.query(`
            INSERT INTO settlements (id, "driverName", month, year, "payMode", "payRate", "tripCount", "totalDistance", "totalRevenue", "grossPay", advances, deductions, "netPay", status, notes, "createdAt", "updatedAt", "driverId")
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) ON CONFLICT DO NOTHING
          `, [
            uuid(), driverName, month, year,
            rand(['per_km','flat_salary','per_trip','mixed']),
            randFloat(0.5,2.0,2),
            randInt(5,25), randFloat(2000,15000,0),
            randFloat(5000,20000,2),
            gross, advances, deductions, netPay,
            rand(settStatuses),
            'Decontare ' + month + '/' + year + ' - ' + driverName,
            new Date(), new Date(), driverId
          ]);
        } catch(e) { console.log(`  ⚠️ settlement ${i}: ${e.message}`); }
      }
      console.log('  ✅ Updated settlements with driver IDs');
    }
  }

  // ---- FINAL COUNTS ----
  console.log('\n📊 FINAL ROW COUNTS:');
  const finalTables = ['clients','customers','drivers','trucks','trailers','trips','orders','invoices','expenses','payments','maintenance','payrolls','trip_costs','shipments','stops','order_stops','settlements','notifications','leads','driver_documents','truck_documents','client_locations','client_rates','cargo_items','invoice_items'];
  for (const t of finalTables) {
    try {
      const r = await client.query(`SELECT COUNT(*) FROM "${t}"`);
      const count = parseInt(r.rows[0].count);
      const status = count >= 20 ? '✅' : count > 0 ? '⚠️' : '❌';
      console.log(`  ${status} ${t}: ${count} rows`);
    } catch(e) { console.log(`  ❓ ${t}: error - ${e.message}`); }
  }

  await client.end();
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
