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
function phoneRO() { return '+407' + randInt(10,99) + randInt(100000,999999); }
function vatRO() { return 'RO' + randInt(10000000,99999999); }

async function main() {
  await client.connect();
  console.log('✅ Connected');

  // Get existing IDs
  const driversRes = await client.query(`SELECT id FROM drivers LIMIT 20`);
  const driverIds = driversRes.rows.map(r => r.id);
  const trucksRes = await client.query(`SELECT id FROM trucks LIMIT 20`);
  const truckIds = trucksRes.rows.map(r => r.id);
  const tripsRes = await client.query(`SELECT id FROM trips LIMIT 20`);
  const tripIds = tripsRes.rows.map(r => r.id);
  const companyRes = await client.query(`SELECT id FROM companies LIMIT 1`);
  const companyId = companyRes.rows[0]?.id;
  console.log('CompanyId:', companyId, '| Drivers:', driverIds.length, '| Trucks:', truckIds.length, '| Trips:', tripIds.length);

  // ---- CUSTOMERS (fix - using snake_case columns) ----
  console.log('\n📦 Inserting CUSTOMERS (correct schema)...');
  const customerIds = [];
  for (let i = 0; i < 20; i++) {
    const id = uuid();
    customerIds.push(id);
    const lname = COMPANIES[(i + 3) % COMPANIES.length];
    const tradeName = lname.replace(' SRL','').replace(' SA','');
    try {
      await client.query(`
        INSERT INTO customers (id, company_id, code, legal_name, trading_name, short_name, registration_number, vat_number, country, default_language, default_currency, main_email, phone, mobile, website, payment_terms, credit_limit, commercial_status, status, is_active, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
        ON CONFLICT DO NOTHING
      `, [
        id, companyId,
        'CLI-' + String(i+1).padStart(3,'0'),
        lname, tradeName, tradeName.substring(0,6).toUpperCase(),
        'J' + randInt(10,40) + '/' + randInt(100,9999) + '/' + randInt(2010,2024),
        vatRO(), rand(COUNTRIES.slice(0,3)),
        'ro', 'EUR',
        `contact@${tradeName.toLowerCase().replace(/\s/g,'-')}.ro`,
        phoneRO(), phoneRO(),
        `https://www.${tradeName.toLowerCase().replace(/\s/g,'')}.ro`,
        randInt(15,60) + '_days',
        randFloat(5000,100000,0),
        rand(['prospect','active','inactive','vip']),
        'active', true,
        randDate('2020-01-01','2024-12-31'), new Date()
      ]);
    } catch(e) {
      console.log(`  ⚠️ customer ${i}: ${e.message}`);
    }
  }
  console.log(`  ✅ Inserted ${customerIds.length} customers`);

  // ---- ORDERS (fix - using actual columns) ----
  console.log('\n📦 Inserting ORDERS (correct schema)...');
  const orderIds = [];
  const orderStatuses = ['pending','confirmed','in_transit','delivered','cancelled','invoiced'];
  for (let i = 0; i < 20; i++) {
    const id = uuid();
    orderIds.push(id);
    const custId = customerIds[i % customerIds.length];
    const tripId = tripIds[i % tripIds.length];
    const pickupCity = rand(CITIES);
    const delivCity = rand(CITIES.filter(c => c !== pickupCity));
    const pickupDate = randDate('2024-01-01','2026-09-01');
    const delivDate = new Date(pickupDate.getTime() + randInt(1,7) * 24 * 3600 * 1000);
    try {
      await client.query(`
        INSERT INTO orders (id, "companyId", "orderNumber", "customerReference", "internalReference", "transportType", status, "origin_city", "origin_country", "destination_city", "destination_country", "goods_description", "weight_kg", "volume_m3", pallets, "loading_meters", "is_adr", "is_temperature_controlled", "requested_pickup_at", "requested_delivery_at", price, currency, notes, "contactPerson", "contactPhone", "distanceKm", "estimatedCost", "estimatedProfit", "createdAt", "updatedAt", "customer_id", "tripId")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32)
        ON CONFLICT DO NOTHING
      `, [
        id, companyId,
        'ORD-' + String(i+1).padStart(4,'0'),
        'REF-CLI-' + randInt(10000,99999),
        'INT-' + randInt(10000,99999),
        rand(['FTL','LTL','Groupage','Dedicated']),
        rand(orderStatuses),
        pickupCity, rand(COUNTRIES),
        delivCity, rand(COUNTRIES),
        'Transport ' + rand(CARGO_NAMES),
        randFloat(1000,24000,0).toString(),
        randFloat(10,100,1).toString(),
        randInt(1,34),
        randFloat(2,13.6,1).toString(),
        Math.random() < 0.1, Math.random() < 0.15,
        pickupDate, delivDate,
        randFloat(500,8000,2), 'EUR',
        'Comandă transport ' + rand(CARGO_NAMES) + '. ' + rand(['Urgent.','Standard.','Fragilă.']),
        rand(FIRST_NAMES) + ' ' + rand(LAST_NAMES),
        phoneRO(),
        randFloat(200,2500,0),
        randFloat(400,3000,2), randFloat(100,2000,2),
        new Date(), new Date(),
        custId || null, tripId || null
      ]);
    } catch(e) {
      console.log(`  ⚠️ order ${i}: ${e.message}`);
    }
  }
  console.log(`  ✅ Inserted ${orderIds.length} orders`);

  // ---- STOPS (correct schema) ----
  console.log('\n📦 Inserting STOPS...');
  const stopIds = [];
  for (let i = 0; i < 25; i++) {
    const id = uuid();
    stopIds.push(id);
    const tripId = tripIds[i % tripIds.length];
    const city = rand(CITIES);
    const type = rand(['pickup','delivery']);
    const timeMin = randDate('2024-01-01','2026-09-01');
    const timeMax = new Date(timeMin.getTime() + 4 * 3600 * 1000);
    try {
      await client.query(`
        INSERT INTO stops (id, sequence, address, "companyName", country, city, "postalCode", "contactPerson", phone, email, "timeZone", reference, notes, latitude, longitude, status, "timeWindowMin", "timeWindowMax", type, "etaStatus", "createdAt", "updatedAt", "companyId", "tripId")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
        ON CONFLICT DO NOTHING
      `, [
        id, i + 1,
        'Str. ' + rand(['Industriilor','Comercială','Logistică','Producției']) + ' nr.' + randInt(1,100),
        rand(COMPANIES),
        rand(COUNTRIES), city,
        randInt(100000,999999).toString(),
        rand(FIRST_NAMES) + ' ' + rand(LAST_NAMES),
        phoneRO(),
        'logistica@' + city.toLowerCase().replace(/[^a-z]/g,'') + '.ro',
        rand(['Europe/Bucharest','Europe/Berlin','Europe/Warsaw','Europe/Vienna']),
        'REF-' + randInt(10000,99999),
        'Acces TIR. Program L-V 08:00-17:00. Rampă disponibilă.',
        randFloat(43,55,4), randFloat(20,30,4),
        rand(['pending','arrived','completed','skipped']),
        timeMin, timeMax, type,
        rand(['ON_TIME','DELAYED','EARLY']),
        new Date(), new Date(), companyId, tripId || null
      ]);
    } catch(e) {
      console.log(`  ⚠️ stop ${i}: ${e.message}`);
    }
  }
  console.log(`  ✅ Inserted ${stopIds.length} stops`);

  // ---- SETTLEMENTS (correct schema) ----
  console.log('\n📦 Inserting SETTLEMENTS...');
  const settleStatuses = ['draft','approved','paid'];
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
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        ON CONFLICT DO NOTHING
      `, [
        uuid(), driverName, month, year,
        rand(['per_km','flat_salary','per_trip','mixed']),
        randFloat(0.5,2.0,2),
        randInt(5,25), randFloat(2000,15000,0),
        randFloat(5000,20000,2),
        gross, advances, deductions, netPay,
        rand(settleStatuses),
        'Decontare ' + month + '/' + year + ' - ' + driverName,
        new Date(), new Date(), driverId || null
      ]);
    } catch(e) {
      console.log(`  ⚠️ settlement ${i}: ${e.message}`);
    }
  }
  console.log('  ✅ Inserted settlements');

  // ---- DRIVER DOCUMENTS (correct schema) ----
  console.log('\n📦 Inserting DRIVER DOCUMENTS...');
  const driverDocTypes = ['license','passport','medical_cert','adr_cert','cpc_cert','id_card','other'];
  for (let i = 0; i < 20; i++) {
    const driverId = driverIds[i % driverIds.length];
    if (!driverId) { console.log(`  ⚠️ no driver for ${i}`); continue; }
    try {
      await client.query(`
        INSERT INTO driver_documents (id, type, "documentNumber", "expiryDate", "fileUrl", "createdAt", "driverId")
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT DO NOTHING
      `, [
        uuid(),
        rand(driverDocTypes),
        String.fromCharCode(65 + randInt(0,25)) + String.fromCharCode(65 + randInt(0,25)) + randInt(100000,999999),
        new Date(randDate('2025-01-01','2030-12-31')),
        null,
        new Date(),
        driverId
      ]);
    } catch(e) {
      console.log(`  ⚠️ driver_document ${i}: ${e.message}`);
    }
  }
  console.log('  ✅ Inserted driver documents');

  // ---- TRUCK DOCUMENTS (correct schema) ----
  console.log('\n📦 Inserting TRUCK DOCUMENTS...');
  const truckDocTypes = ['registration','insurance_rca','insurance_casco','vignette_ro','vignette_de','vignette_at','vignette_cz','itp','cmr_insurance','other'];
  for (let i = 0; i < 20; i++) {
    const truckId = truckIds[i % truckIds.length];
    if (!truckId) { console.log(`  ⚠️ no truck for ${i}`); continue; }
    try {
      await client.query(`
        INSERT INTO truck_documents (id, type, "documentNumber", "expiryDate", "fileUrl", "createdAt", "truckId")
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT DO NOTHING
      `, [
        uuid(),
        rand(truckDocTypes),
        'DOC-' + randInt(100000,999999),
        new Date(randDate('2025-01-01','2030-12-31')),
        null,
        new Date(),
        truckId
      ]);
    } catch(e) {
      console.log(`  ⚠️ truck_document ${i}: ${e.message}`);
    }
  }
  console.log('  ✅ Inserted truck documents');

  // ---- CUSTOMER LOCATIONS (check actual schema) ----
  console.log('\n📦 Checking customer_locations schema...');
  const clCols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='customer_locations' ORDER BY ordinal_position`);
  console.log('  Columns:', clCols.rows.map(r => r.column_name).join(', '));

  // ---- CLIENT LOCATIONS ----
  console.log('\n📦 Inserting CLIENT LOCATIONS...');
  const clLocsColsRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='client_locations' ORDER BY ordinal_position`);
  console.log('  client_locations columns:', clLocsColsRes.rows.map(r => r.column_name).join(', '));

  // ---- CLIENT RATES ----
  console.log('\n📦 Checking CLIENT RATES schema...');
  const crCols = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='client_rates' ORDER BY ordinal_position`);
  console.log('  client_rates columns:', crCols.rows.map(r => r.column_name + ':' + r.data_type).join(', '));

  // ---- CARGO TYPES ----
  console.log('\n📦 Checking CARGO TYPES schema...');
  const ctCols = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='cargo_types' ORDER BY ordinal_position`);
  const ctCount = await client.query(`SELECT COUNT(*) FROM cargo_types`);
  console.log('  cargo_types ('+ctCount.rows[0].count+' rows):', ctCols.rows.map(r => r.column_name + ':' + r.data_type).join(', '));

  // ---- ORDER STOPS ----
  console.log('\n📦 Checking ORDER STOPS schema...');
  const osCols = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='order_stops' ORDER BY ordinal_position`);
  const osCount = await client.query(`SELECT COUNT(*) FROM order_stops`);
  console.log('  order_stops ('+osCount.rows[0].count+' rows):', osCols.rows.map(r => r.column_name + ':' + r.data_type).join(', '));

  console.log('\n✅ Fix script done!');
  await client.end();
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
