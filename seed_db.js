const { Client } = require('pg');

const DB_URL = 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway';

const client = new Client({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false }
});

// Admin IDs to protect
const ADMIN_IDS = [
  '896433f7-4ae8-482a-84ef-782437840592',
  '5007bdad-da64-4c8f-b25d-52ef2d546bd6',
  '880bef9a-424c-4aab-866a-9c75d4259f42'
];
const ADMIN_EMAILS = ['superadmin@hapcargo.local', 'admin@hapcargo.com', 'admin@hapcargo.ro', 'admin@hapcargo.local'];

// ===================== HELPERS =====================
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min, max, dec = 2) { return parseFloat((Math.random() * (max - min) + min).toFixed(dec)); }
function randDate(start, end) {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return new Date(s + Math.random() * (e - s));
}
function uuid() { return require('crypto').randomUUID(); }

const ROMANIAN_FIRST_NAMES = ['Alexandru','Andrei','Bogdan','Catalin','Cosmin','Daniel','Emil','Florin','Gabriel','Gheorghe','Ion','Ioan','Ionut','Liviu','Lucian','Marius','Mihai','Mircea','Nicolae','Octavian','Petru','Radu','Razvan','Sebastian','Sorin','Stefan','Teodor','Vasile','Victor','Vlad','Adrian','Alin','Claudiu','Cristian','Dumitru','Eduard','Felix','Gelu','Horatiu','Iosif','Ana','Elena','Maria','Ioana','Mihaela','Cristina','Andreea','Diana','Alina','Raluca'];
const ROMANIAN_LAST_NAMES = ['Popescu','Ionescu','Popa','Stan','Stoica','Gheorghe','Moldovan','Munteanu','Constantin','Dima','Florea','Dumitrescu','Badea','Niculescu','Serban','Preda','Nica','Draghici','Grigore','Matei','Rusu','Luca','Crisan','Dobre','Muresan','Ungureanu','Oprea','Petrescu','Sandu','Costache'];
const COMPANIES_RO = ['TransRo SRL','EuroTrans SA','CargoSpeed SRL','LogiRom SRL','FastFreight SRL','RomCargo SA','BalticTrans SRL','DunaTrans SRL','ExpresCargo SRL','PolyTrans SRL','AgriTrans SRL','TerraLogistics SRL','FlexiCargo SA','OmniFret SRL','TransCarpat SRL'];
const CITIES_EU = ['București','Cluj-Napoca','Timișoara','Brașov','Constanța','Iași','Craiova','Galați','Ploiești','Oradea','Sibiu','Bacău','Arad','Pitești','Baia Mare','Hamburg','München','Berlin','Frankfurt','Wien','Praga','Varșovia','Bratislava','Budapest','Sofia','Belgrad','Amsterdam','Rotterdam','Lyon','Paris'];
const COUNTRIES = ['RO','DE','AT','CZ','PL','SK','HU','BG','RS','NL','FR','IT','ES','BE','HR'];
const TRUCK_BRANDS = ['Volvo','Scania','Mercedes-Benz','DAF','MAN','Iveco','Renault','Ford'];
const TRAILER_MAKES = ['Schmitz','Krone','Kögel','Wielton','Fliegl','Renders','Schwarzmüller'];
const CARGO_NAMES = ['Mobilă','Produse alimentare','Materiale de construcții','Piese auto','Produse cosmetice','Textile','Echipamente electrice','Chimicale','Hârtie','Produse farmaceutice','Componente industriale','Produse din plastic','Materiale agricole','Echipamente IT','Produse metalice'];
const EXPENSE_DESCRIPTIONS = ['Motorină', 'Taxă autostradă A1', 'Taxă pod Fetești', 'Reparație motor', 'Schimb anvelope', 'Asigurare RCA', 'Asigurare CMR', 'Revizii periodice', 'Taxă vignietă DE', 'Taxă vignietă AT', 'Taxă vignietă CZ', 'Parcare camion', 'Spălare camion', 'Cantare TIR', 'Piese de schimb'];

function phoneRO() { return '+407' + randInt(10,99) + randInt(100000,999999); }
function vatRO() { return 'RO' + randInt(10000000,99999999); }
function ibanRO() { return 'RO' + randInt(10,99) + 'RNCB' + randInt(1000000000000000, 9999999999999999); }
function plateRO() {
  const counties = ['B','CJ','TM','BV','CT','IS','DJ','GL','PH','BH','SB','BC','AR','AG','MM','BN','CS','CV','DB','GR','HD','HR','IF','IL','MH','MS','NT','OT','PH','SJ','SM','SV','TL','TR','VL','VN','VS'];
  return rand(counties) + randInt(10,99) + String.fromCharCode(65+randInt(0,25)) + String.fromCharCode(65+randInt(0,25)) + String.fromCharCode(65+randInt(0,25));
}

// ===================== MAIN =====================
async function main() {
  await client.connect();
  console.log('✅ Connected to PostgreSQL');

  // ============ GET COMPANY ID ============
  let companyId;
  const companyRes = await client.query(`SELECT id FROM companies LIMIT 1`);
  if (companyRes.rows.length > 0) {
    companyId = companyRes.rows[0].id;
    console.log('📌 Using company ID:', companyId);
  }

  // ============ STEP 1: CLEAR DATA (protect admins) ============
  console.log('\n🧹 Clearing existing data (protecting admin accounts)...');

  const tablesToClear = [
    'tachograph_activity_events','tachograph_live_state','tachographs','telematics_devices',
    'vehicle_live_state','timeline_events','planning_actions','route_plan_stops','truck_route_plans',
    'stop_tasks','order_stops','stops','trip_costs','documents','driver_documents','truck_documents',
    'maintenance_attachments','maintenance','payrolls','settlements','payments','invoice_items','invoices',
    'expenses','cargo_items','shipments','trips','orders','notifications',
    'driver_hos','driver_tachograph_cards',
    'trailers','trucks','drivers',
    'customer_tag_assignments','customer_contacts','customer_locations','client_rates','client_locations',
    'leads','customers','clients',
    'audit_logs','action_logs','report_history','saved_reports','scheduled_reports',
    'user_sessions','user_roles','company_users',
    'document_shares',
  ];

  for (const tbl of tablesToClear) {
    try {
      await client.query(`DELETE FROM "${tbl}"`);
      console.log(`  🗑️  Cleared: ${tbl}`);
    } catch(e) {
      console.log(`  ⚠️  Could not clear ${tbl}: ${e.message}`);
    }
  }

  // Clear users but protect admins
  try {
    const adminEmailsLiteral = ADMIN_EMAILS.map(e => `'${e}'`).join(',');
    const adminIdsLiteral = ADMIN_IDS.map(e => `'${e}'`).join(',');
    await client.query(`DELETE FROM users WHERE email NOT IN (${adminEmailsLiteral}) AND (id NOT IN (${adminIdsLiteral}) OR id IS NULL)`);
    console.log('  🗑️  Cleared users (admin protected)');
  } catch(e) {
    console.log('  ⚠️  Error clearing users:', e.message);
  }

  console.log('\n✅ Data cleared. Starting population...\n');

  // ============ STEP 2: POPULATE ============

  // ---- CLIENTS ----
  console.log('📦 Inserting CLIENTS...');
  const clientIds = [];
  for (let i = 0; i < 20; i++) {
    const id = uuid();
    clientIds.push(id);
    const name = COMPANIES_RO[i % COMPANIES_RO.length] + (i > 14 ? ' ' + (i - 14) : '');
    try {
      await client.query(`
        INSERT INTO clients (id, name, email, phone, address, city, country, "vatNumber", "contactPerson", notes, "isActive", "createdAt", "updatedAt", "companyId")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        ON CONFLICT DO NOTHING
      `, [
        id, name,
        `contact@${name.toLowerCase().replace(/\s/g,'-').replace(/[^a-z0-9-]/g,'')}.ro`,
        phoneRO(),
        'Strada ' + rand(['Mihai Eminescu','Nicolae Bălcescu','Independenței','Republicii']) + ' nr.' + randInt(1,99),
        rand(CITIES_EU.slice(0,10)), rand(COUNTRIES.slice(0,3)),
        vatRO(), rand(ROMANIAN_FIRST_NAMES) + ' ' + rand(ROMANIAN_LAST_NAMES),
        'Client important, plătitor de TVA.',
        true, new Date(), new Date(), companyId
      ]);
    } catch(e) {
      // try simpler insert
      try {
        await client.query(`INSERT INTO clients (id, name, email, phone, "isActive") VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
          [id, name, `client${i}@demo.ro`, phoneRO(), true]);
      } catch(e2) { console.log(`  ⚠️ clients: ${e2.message}`); }
    }
  }
  console.log(`  ✅ Inserted ${clientIds.length} clients`);

  // ---- CUSTOMERS ----
  console.log('📦 Inserting CUSTOMERS...');
  const customerIds = [];
  for (let i = 0; i < 20; i++) {
    const id = uuid();
    customerIds.push(id);
    const fname = rand(ROMANIAN_FIRST_NAMES);
    const lname = rand(ROMANIAN_LAST_NAMES);
    const compName = COMPANIES_RO[(i + 5) % COMPANIES_RO.length] + ' ' + String.fromCharCode(65 + i % 26);
    try {
      await client.query(`
        INSERT INTO customers (id, name, email, phone, "contactPerson", "vatNumber", "registrationNumber", address, city, country, "postalCode", "isActive", "creditLimit", "paymentTerms", notes, "createdAt", "updatedAt", "companyId")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        ON CONFLICT DO NOTHING
      `, [
        id, compName,
        `info@${compName.toLowerCase().replace(/\s/g,'-').replace(/[^a-z0-9-]/g,'')}.ro`,
        phoneRO(), fname + ' ' + lname, vatRO(),
        'J' + randInt(10,40) + '/' + randInt(100,9999) + '/' + randInt(2010,2024),
        'Str. ' + rand(['Libertății','Victoriei','Unirii','Florilor']) + ' nr.' + randInt(1,200),
        rand(CITIES_EU.slice(0,15)), rand(COUNTRIES.slice(0,5)),
        randInt(100000,999999).toString().padStart(6,'0'),
        true, randFloat(5000,100000,0), randInt(15,60),
        'Client fidel. ' + randInt(1,10) + ' ani de colaborare.',
        randDate('2020-01-01','2024-12-31'), new Date(), companyId
      ]);
    } catch(e) {
      try {
        await client.query(`INSERT INTO customers (id, name, email, phone, "isActive") VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
          [id, compName, `customer${i}@demo.ro`, phoneRO(), true]);
      } catch(e2) { console.log(`  ⚠️ customers: ${e2.message}`); }
    }
  }
  console.log(`  ✅ Inserted ${customerIds.length} customers`);

  // ---- DRIVERS (users with role=driver) ----
  console.log('📦 Inserting DRIVERS (users)...');
  const driverUserIds = [];
  for (let i = 0; i < 20; i++) {
    const id = uuid();
    const fname = rand(ROMANIAN_FIRST_NAMES);
    const lname = rand(ROMANIAN_LAST_NAMES);
    const email = `sofer${i + 1}@hapcargo.ro`;
    try {
      await client.query(`
        INSERT INTO users (id, email, first_name, last_name, password_hash, status, email_verified, role, "isActive", "companyId", "createdAt", "updatedAt", "grossSalary", "dailyRate", language)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT DO NOTHING
      `, [
        id, email, fname, lname,
        '$2b$10$hashedpasswordplaceholder123456789012345678901234567',
        'active', true, 'driver', true, companyId, new Date(), new Date(),
        randFloat(3000,8000,0).toString(), randFloat(80,150,0).toString(), 'ro'
      ]);
      driverUserIds.push({ id, fname, lname, email });
    } catch(e) {
      console.log(`  ⚠️ user driver ${i}: ${e.message}`);
    }
  }
  console.log(`  ✅ Inserted ${driverUserIds.length} driver users`);

  // ---- DRIVERS TABLE ----
  console.log('📦 Inserting DRIVERS...');
  const driverIds = [];
  const driverStatuses = ['available','in_trip','off','sick','vacation'];
  for (let i = 0; i < 20; i++) {
    const id = uuid();
    driverIds.push(id);
    const u = driverUserIds[i] || { fname: rand(ROMANIAN_FIRST_NAMES), lname: rand(ROMANIAN_LAST_NAMES), email: `driver_extra${i}@hapcargo.ro`, id: null };
    try {
      await client.query(`
        INSERT INTO drivers (id, "firstName", "lastName", email, phone, status, "licenseNumber", "licenseExpiry", nationality, "dateOfBirth", address, city, country, "postalCode", "emergencyContact", "emergencyPhone", notes, "isActive", "createdAt", "updatedAt", "companyId", "userId", "grossSalary", "dailyRate")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
        ON CONFLICT DO NOTHING
      `, [
        id, u.fname, u.lname, u.email, phoneRO(),
        rand(driverStatuses),
        'B-' + randInt(100000,999999),
        new Date(randDate('2025-01-01','2030-12-31')),
        rand(['RO','BG','PL','UA','MD']),
        new Date(randDate('1970-01-01','2000-12-31')),
        'Str. ' + rand(['Primăverii','Toamnei','Iernii','Verii']) + ' nr.' + randInt(1,100),
        rand(CITIES_EU.slice(0,10)), 'RO',
        randInt(100000,999999).toString(),
        rand(ROMANIAN_FIRST_NAMES) + ' ' + rand(ROMANIAN_LAST_NAMES),
        phoneRO(),
        'Șofer cu experiență de ' + randInt(2,20) + ' ani.',
        true, new Date(), new Date(), companyId, u.id || null,
        randFloat(3000,7000,0), randFloat(80,130,0)
      ]);
    } catch(e) {
      console.log(`  ⚠️ driver ${i}: ${e.message}`);
    }
  }
  console.log(`  ✅ Inserted ${driverIds.length} drivers`);

  // ---- TRUCKS ----
  console.log('📦 Inserting TRUCKS...');
  const truckIds = [];
  const truckStatuses = ['active','in_trip','maintenance','inactive'];
  for (let i = 0; i < 20; i++) {
    const id = uuid();
    truckIds.push(id);
    const brand = rand(TRUCK_BRANDS);
    const models = { 'Volvo': ['FH16','FH','FM','FMX'], 'Scania': ['R500','R450','R410','S500'], 'Mercedes-Benz': ['Actros','Arocs','Atego'], 'DAF': ['XF','CF','LF'], 'MAN': ['TGX','TGS','TGL'], 'Iveco': ['S-WAY','STRALIS','TRAKKER'], 'Renault': ['T520','T480','C480'], 'Ford': ['F-MAX','CARGO'] };
    const model = rand(models[brand] || ['Model X']);
    try {
      await client.query(`
        INSERT INTO trucks (id, "licensePlate", brand, model, year, "truckType", "euronorm", "payloadCapacity", "maxWeightKg", "maxLdm", "maxVolumeCbm", "maxPallets", "loadingAccess", "loadingRule", "costPerKm", "fuelConsumption", status, "currentLat", "currentLng", "totalMileage", "nextMaintenanceMileage", "createdAt", "updatedAt", "companyId", "driverId")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
        ON CONFLICT DO NOTHING
      `, [
        id, plateRO(), brand, model, randInt(2018,2024),
        rand(['mega','standard','frigo']),
        rand(['EURO5','EURO6','EURO6c']),
        randFloat(20000,24000,0), randFloat(40000,44000,0),
        randFloat(12,13.6,1), randFloat(80,100,0), randInt(33,34),
        rand(['rear_only','side_only','rear_and_side','full_access']),
        rand(['lifo','fifo','flexible']),
        randFloat(1.2,2.5,2), randFloat(28,38,1),
        rand(truckStatuses),
        randFloat(43,48,4), randFloat(23,30,4),
        randFloat(100000,800000,0), randFloat(50000,150000,0),
        new Date(), new Date(), companyId,
        driverIds[i] || null
      ]);
    } catch(e) {
      console.log(`  ⚠️ truck ${i}: ${e.message}`);
    }
  }
  console.log(`  ✅ Inserted ${truckIds.length} trucks`);

  // ---- TRAILERS ----
  console.log('📦 Inserting TRAILERS...');
  const trailerIds = [];
  const trailerTypes = ['mega','frigo','standard','walking_floor','container','flatbed','other'];
  const trailerStatuses = ['active','maintenance','inactive'];
  for (let i = 0; i < 20; i++) {
    const id = uuid();
    trailerIds.push(id);
    const make = rand(TRAILER_MAKES);
    const trailerType = rand(trailerTypes);
    try {
      await client.query(`
        INSERT INTO trailers (id, "licensePlate", make, model, year, type, status, "payloadCapacity", "maxWeightKg", "ldm", "volumeCbm", "pallets", "createdAt", "updatedAt", "companyId")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT DO NOTHING
      `, [
        id, plateRO(), make,
        make + ' ' + rand(['Curtainsider','Mega','Reefer','Tipper','Flatbed','Box']),
        randInt(2015,2024), trailerType, rand(trailerStatuses),
        randFloat(20000,24000,0), randFloat(36000,44000,0),
        randFloat(12,13.6,1), randFloat(80,100,0), randInt(33,34),
        new Date(), new Date(), companyId
      ]);
    } catch(e) {
      // Try minimal
      try {
        await client.query(`INSERT INTO trailers (id, "licensePlate", make, type, status, "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
          [id, plateRO(), make, trailerType, rand(trailerStatuses), new Date(), new Date()]);
      } catch(e2) { console.log(`  ⚠️ trailer ${i}: ${e2.message}`); }
    }
  }
  console.log(`  ✅ Inserted ${trailerIds.length} trailers`);

  // ---- TRIPS ----
  console.log('📦 Inserting TRIPS...');
  const tripIds = [];
  for (let i = 0; i < 20; i++) {
    const id = uuid();
    tripIds.push(id);
    const depCity = rand(CITIES_EU);
    const arrCity = rand(CITIES_EU.filter(c => c !== depCity));
    const depDate = randDate('2024-01-01','2026-09-01');
    const arrDate = new Date(depDate.getTime() + randInt(1,5) * 24 * 3600 * 1000);
    const distKm = randFloat(200, 2500, 0);
    const tripStatuses = ['planned','in_progress','completed','cancelled'];
    try {
      await client.query(`
        INSERT INTO trips (id, status, "departureCity", "arrivalCity", "departureDate", "arrivalDate", "estimatedKm", "actualKm", "loadingMeters", "totalWeight", notes, "createdAt", "updatedAt", "companyId", "truckId", "driverId", "trailerId")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        ON CONFLICT DO NOTHING
      `, [
        id, rand(tripStatuses),
        depCity, arrCity, depDate, arrDate,
        distKm, distKm * randFloat(0.95,1.05,0),
        randFloat(5,13.6,1), randFloat(5000,24000,0),
        'Cursă ' + depCity + ' → ' + arrCity + '. Marfă paletizată.',
        new Date(), new Date(), companyId,
        truckIds[i % truckIds.length] || null,
        driverIds[i % driverIds.length] || null,
        trailerIds[i % trailerIds.length] || null
      ]);
    } catch(e) {
      console.log(`  ⚠️ trip ${i}: ${e.message}`);
    }
  }
  console.log(`  ✅ Inserted ${tripIds.length} trips`);

  // ---- ORDERS ----
  console.log('📦 Inserting ORDERS...');
  const orderIds = [];
  const orderStatuses = ['pending','confirmed','in_transit','delivered','cancelled','invoiced'];
  for (let i = 0; i < 20; i++) {
    const id = uuid();
    orderIds.push(id);
    const custId = customerIds[i % customerIds.length] || clientIds[i % clientIds.length];
    const pickupCity = rand(CITIES_EU);
    const delivCity = rand(CITIES_EU.filter(c => c !== pickupCity));
    const pickupDate = randDate('2024-01-01','2026-09-01');
    const delivDate = new Date(pickupDate.getTime() + randInt(1,7) * 24 * 3600 * 1000);
    try {
      await client.query(`
        INSERT INTO orders (id, "orderNumber", status, "pickupCity", "deliveryCity", "pickupDate", "deliveryDate", "totalWeight", "loadingMeters", "totalPrice", currency, notes, "createdAt", "updatedAt", "companyId", "customerId", "tripId")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        ON CONFLICT DO NOTHING
      `, [
        id, 'ORD-' + String(i + 1).padStart(4,'0'),
        rand(orderStatuses), pickupCity, delivCity,
        pickupDate, delivDate,
        randFloat(1000,24000,0), randFloat(2,13.6,1),
        randFloat(500,8000,0), 'EUR',
        'Comandă transport ' + rand(CARGO_NAMES) + '. Client: ' + rand(COMPANIES_RO) + '.',
        new Date(), new Date(), companyId,
        custId || null,
        tripIds[i % tripIds.length] || null
      ]);
    } catch(e) {
      console.log(`  ⚠️ order ${i}: ${e.message}`);
    }
  }
  console.log(`  ✅ Inserted ${orderIds.length} orders`);

  // ---- CARGO ITEMS ----
  console.log('📦 Inserting CARGO ITEMS...');
  const cargoUnits = ['pallet','package','box','crate','roll','machine','coil','container','other'];
  for (let i = 0; i < 20; i++) {
    const orderId = orderIds[i % orderIds.length];
    if (!orderId) continue;
    try {
      await client.query(`
        INSERT INTO cargo_items (id, "orderId", name, quantity, unit, weight, volume, length, width, height, "isFragile", "isStackable", "isDangerous", notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        ON CONFLICT DO NOTHING
      `, [
        uuid(), orderId, rand(CARGO_NAMES),
        randInt(1,33), rand(cargoUnits),
        randFloat(100,24000,0), randFloat(1,100,2),
        randFloat(0.8,1.2,2), randFloat(0.8,1.2,2), randFloat(0.5,2.5,2),
        Math.random() < 0.2, Math.random() < 0.7, Math.random() < 0.1,
        'Ambalat corespunzător. A nu se uda.'
      ]);
    } catch(e) {
      console.log(`  ⚠️ cargo_item ${i}: ${e.message}`);
    }
  }
  console.log('  ✅ Inserted cargo items');

  // ---- EXPENSES ----
  console.log('📦 Inserting EXPENSES...');
  const expenseCategories = ['fuel','maintenance','accounting','salary','toll','other'];
  for (let i = 0; i < 20; i++) {
    const tripId = tripIds[i % tripIds.length] || null;
    const driverId = driverIds[i % driverIds.length] || null;
    const truckId = truckIds[i % truckIds.length] || null;
    const cat = rand(expenseCategories);
    const amounts = { fuel: randFloat(200,1200,2), maintenance: randFloat(300,3000,2), accounting: randFloat(100,500,2), salary: randFloat(3000,8000,2), toll: randFloat(30,300,2), other: randFloat(50,500,2) };
    try {
      await client.query(`
        INSERT INTO expenses (id, category, amount, currency, description, "receiptUrl", date, "createdAt", "updatedAt", "companyId", "tripId", "driverId", "truckId")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT DO NOTHING
      `, [
        uuid(), cat, amounts[cat], 'EUR',
        rand(EXPENSE_DESCRIPTIONS),
        null,
        new Date(randDate('2024-01-01','2026-09-01')),
        new Date(), new Date(), companyId,
        tripId, driverId, truckId
      ]);
    } catch(e) {
      console.log(`  ⚠️ expense ${i}: ${e.message}`);
    }
  }
  console.log('  ✅ Inserted expenses');

  // ---- INVOICES ----
  console.log('📦 Inserting INVOICES...');
  const invoiceIds = [];
  const invoiceStatuses = ['draft','approved','sent','viewed','paid','overdue','cancelled'];
  const vatTypes = ['NORMAL','REVERSE_CHARGE','EXEMPT'];
  for (let i = 0; i < 20; i++) {
    const id = uuid();
    invoiceIds.push(id);
    const custId = customerIds[i % customerIds.length] || null;
    const orderId = orderIds[i % orderIds.length] || null;
    const issueDate = randDate('2024-01-01','2026-09-01');
    const dueDate = new Date(issueDate.getTime() + 30 * 24 * 3600 * 1000);
    const subtotal = randFloat(500,10000,2);
    const vat = randFloat(0,subtotal * 0.19,2);
    try {
      await client.query(`
        INSERT INTO invoices (id, "invoiceNumber", status, "vatType", "issueDate", "dueDate", subtotal, "vatAmount", total, currency, notes, "createdAt", "updatedAt", "companyId", "customerId", "orderId")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        ON CONFLICT DO NOTHING
      `, [
        id, 'FACT-' + String(2024000 + i + 1),
        rand(invoiceStatuses), rand(vatTypes),
        issueDate, dueDate,
        subtotal, vat, subtotal + vat, 'EUR',
        'Factură transport ' + rand(CARGO_NAMES) + '. Termen plată 30 zile.',
        new Date(), new Date(), companyId, custId, orderId
      ]);
    } catch(e) {
      console.log(`  ⚠️ invoice ${i}: ${e.message}`);
    }
  }
  console.log(`  ✅ Inserted ${invoiceIds.length} invoices`);

  // ---- INVOICE ITEMS ----
  console.log('📦 Inserting INVOICE ITEMS...');
  for (let i = 0; i < 20; i++) {
    const invId = invoiceIds[i % invoiceIds.length];
    if (!invId) continue;
    const qty = randInt(1,5);
    const unitPrice = randFloat(200,2000,2);
    try {
      await client.query(`
        INSERT INTO invoice_items (id, "invoiceId", description, quantity, "unitPrice", "vatRate", total)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT DO NOTHING
      `, [
        uuid(), invId,
        'Transport ' + rand(CARGO_NAMES) + ' - ' + rand(CITIES_EU) + ' → ' + rand(CITIES_EU),
        qty, unitPrice, rand([0,19,0]),
        qty * unitPrice
      ]);
    } catch(e) {
      console.log(`  ⚠️ invoice_item ${i}: ${e.message}`);
    }
  }
  console.log('  ✅ Inserted invoice items');

  // ---- PAYMENTS ----
  console.log('📦 Inserting PAYMENTS...');
  const paymentMethods = ['bank_transfer','cash','card','check'];
  for (let i = 0; i < 20; i++) {
    const invId = invoiceIds[i % invoiceIds.length];
    const custId = customerIds[i % customerIds.length] || null;
    try {
      await client.query(`
        INSERT INTO payments (id, amount, currency, method, "paymentDate", reference, notes, "createdAt", "updatedAt", "companyId", "invoiceId", "customerId")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT DO NOTHING
      `, [
        uuid(), randFloat(500,10000,2), 'EUR',
        rand(paymentMethods),
        new Date(randDate('2024-01-01','2026-09-01')),
        'REF-' + randInt(100000,999999),
        'Plată factură transport.',
        new Date(), new Date(), companyId,
        invId || null, custId || null
      ]);
    } catch(e) {
      console.log(`  ⚠️ payment ${i}: ${e.message}`);
    }
  }
  console.log('  ✅ Inserted payments');

  // ---- MAINTENANCE ----
  console.log('📦 Inserting MAINTENANCE...');
  const maintTypes = ['preventive','corrective','inspection'];
  const maintStatuses = ['scheduled','in_progress','done'];
  for (let i = 0; i < 20; i++) {
    const truckId = truckIds[i % truckIds.length];
    const schedDate = randDate('2024-01-01','2026-12-31');
    const doneDate = new Date(schedDate.getTime() + randInt(1,5) * 24 * 3600 * 1000);
    try {
      await client.query(`
        INSERT INTO maintenance (id, type, status, "scheduledDate", "completedDate", description, cost, "workshopName", "mileageAtMaintenance", "nextMileage", notes, "createdAt", "updatedAt", "companyId", "truckId")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT DO NOTHING
      `, [
        uuid(), rand(maintTypes), rand(maintStatuses),
        schedDate, doneDate,
        rand(['Schimb ulei și filtru','Revizie completă','Înlocuire plăcuțe frână','Verificare sistem ABS','Schimb anvelope','Reparație motor','Verificare tahograf','Ungere articulații']),
        randFloat(200,5000,2),
        rand(['Service Auto TIR SRL','AutoPro Service','TruckFix Center','MotoService Rapid']),
        randFloat(100000,800000,0), randFloat(150000,850000,0),
        'Efectuată conform planificării. Piesele au fost înlocuite.',
        new Date(), new Date(), companyId, truckId || null
      ]);
    } catch(e) {
      console.log(`  ⚠️ maintenance ${i}: ${e.message}`);
    }
  }
  console.log('  ✅ Inserted maintenance records');

  // ---- PAYROLLS ----
  console.log('📦 Inserting PAYROLLS...');
  const payrollStatuses = ['draft','paid','sent'];
  const months = ['2024-01','2024-02','2024-03','2024-04','2024-05','2024-06','2024-07','2024-08','2024-09','2024-10','2024-11','2024-12','2025-01','2025-02','2025-03','2025-04','2025-05','2025-06','2025-07','2025-08'];
  for (let i = 0; i < 20; i++) {
    const driverId = driverIds[i % driverIds.length];
    const gross = randFloat(3500,7000,2);
    const tax = gross * 0.43;
    const net = gross - tax;
    const holiday = gross * 0.0804;
    const daily = randFloat(80,150,2);
    const days = randInt(18,23);
    const totalAllowance = daily * days;
    const bonus = randFloat(0,500,2);
    const deduction = randFloat(0,200,2);
    const totalNet = net + totalAllowance + bonus - deduction;
    const monthStr = months[i % months.length];
    try {
      await client.query(`
        INSERT INTO payrolls (id, month, "grossSalary", "taxAmount", "netSalary", "holidayAllowance", "dailyAllowance", "daysWorked", "totalAllowance", bonuses, deductions, "totalNetToPay", status, "createdAt", "updatedAt", "companyId", "driverId", "userId")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        ON CONFLICT DO NOTHING
      `, [
        uuid(), monthStr,
        gross, tax, net, holiday, daily, days,
        totalAllowance, bonus, deduction, totalNet,
        rand(payrollStatuses), new Date(), new Date(),
        companyId, driverId || null,
        driverUserIds[i % driverUserIds.length]?.id || null
      ]);
    } catch(e) {
      console.log(`  ⚠️ payroll ${i}: ${e.message}`);
    }
  }
  console.log('  ✅ Inserted payrolls');

  // ---- TRIP COSTS ----
  console.log('📦 Inserting TRIP COSTS...');
  const tripCostTypes = ['fuel','toll','parking','ferry','other','extra'];
  for (let i = 0; i < 20; i++) {
    const tripId = tripIds[i % tripIds.length];
    const truckId = truckIds[i % truckIds.length];
    const driverId = driverIds[i % driverIds.length];
    try {
      await client.query(`
        INSERT INTO trip_costs (id, type, amount, description, "driverId", "truckId", category, "createdAt", "tripId")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT DO NOTHING
      `, [
        uuid(), rand(tripCostTypes),
        randFloat(50,2000,2),
        rand(EXPENSE_DESCRIPTIONS),
        driverId?.toString() || null,
        truckId?.toString() || null,
        rand(['operational','administrative','transport']),
        new Date(), tripId || null
      ]);
    } catch(e) {
      console.log(`  ⚠️ trip_cost ${i}: ${e.message}`);
    }
  }
  console.log('  ✅ Inserted trip costs');

  // ---- SHIPMENTS ----
  console.log('📦 Inserting SHIPMENTS...');
  const shipmentStatuses = ['planned','assigned','picked_up','in_transit','delivered','completed','cancelled'];
  for (let i = 0; i < 20; i++) {
    const orderId = orderIds[i % orderIds.length];
    const truckId = truckIds[i % truckIds.length];
    const driverId = driverIds[i % driverIds.length];
    const tripId = tripIds[i % tripIds.length];
    const pickCity = rand(CITIES_EU);
    const delCity = rand(CITIES_EU.filter(c => c !== pickCity));
    try {
      await client.query(`
        INSERT INTO shipments (id, status, "pickupAddress", "pickupCity", "pickupCountry", "deliveryAddress", "deliveryCity", "deliveryCountry", "scheduledPickup", "scheduledDelivery", "actualPickup", "actualDelivery", weight, "loadingMeters", notes, "createdAt", "updatedAt", "companyId", "orderId", "truckId", "driverId", "tripId")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
        ON CONFLICT DO NOTHING
      `, [
        uuid(), rand(shipmentStatuses),
        'Str. Industriilor nr.' + randInt(1,50), pickCity, rand(COUNTRIES),
        'Bd. Unirii nr.' + randInt(1,100), delCity, rand(COUNTRIES),
        new Date(randDate('2024-01-01','2026-09-01')),
        new Date(randDate('2024-02-01','2026-10-01')),
        null, null,
        randFloat(1000,24000,0), randFloat(2,13.6,1),
        'Transport ' + rand(CARGO_NAMES) + '. Livrare la timp garantată.',
        new Date(), new Date(), companyId,
        orderId || null, truckId || null, driverId || null, tripId || null
      ]);
    } catch(e) {
      console.log(`  ⚠️ shipment ${i}: ${e.message}`);
    }
  }
  console.log('  ✅ Inserted shipments');

  // ---- LOCATIONS ----
  console.log('📦 Inserting LOCATIONS...');
  for (let i = 0; i < 20; i++) {
    const city = CITIES_EU[i % CITIES_EU.length];
    try {
      await client.query(`
        INSERT INTO locations (id, name, address, city, country, "postalCode", lat, lng, notes, "isActive", "createdAt", "updatedAt", "companyId")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT DO NOTHING
      `, [
        uuid(), city + ' - Depozit ' + (i + 1),
        'Str. Logistică nr.' + randInt(1,200), city,
        rand(COUNTRIES.slice(0,5)),
        randInt(100000,999999).toString(),
        randFloat(43,55,4), randFloat(20,30,4),
        'Depozit logistic cu rampe de încărcare/descărcare.',
        true, new Date(), new Date(), companyId
      ]);
    } catch(e) {
      console.log(`  ⚠️ location ${i}: ${e.message}`);
    }
  }
  console.log('  ✅ Inserted locations');

  // ---- NOTIFICATIONS ----
  console.log('📦 Inserting NOTIFICATIONS...');
  const notifTypes = ['trip_started','trip_completed','maintenance_due','payment_received','invoice_overdue','new_order','document_uploaded','driver_absence'];
  for (let i = 0; i < 20; i++) {
    const type = rand(notifTypes);
    try {
      await client.query(`
        INSERT INTO notifications (id, type, title, message, "isRead", "relatedId", "createdAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT DO NOTHING
      `, [
        uuid(), type,
        rand(['Cursă nouă planificată', 'Mentenanță programată', 'Factură scadentă', 'Plată primită', 'Document nou uploadat', 'Șofer indisponibil', 'Cursă finalizată', 'Comandă nouă']),
        rand(['Camionul ' + rand(['B01ABC','TM23XYZ','CJ45DEF']) + ' necesită inspecție.', 'Factură FACT-2024001 a expirat.', 'Plată de 2500 EUR primită.', 'Șofer ' + rand(ROMANIAN_FIRST_NAMES) + ' a raportat absență.', 'Cursă București-Hamburg finalizată cu succes.']),
        Math.random() < 0.4, null,
        new Date(randDate('2024-01-01','2026-09-12'))
      ]);
    } catch(e) {
      console.log(`  ⚠️ notification ${i}: ${e.message}`);
    }
  }
  console.log('  ✅ Inserted notifications');

  // ---- LEADS ----
  console.log('📦 Inserting LEADS...');
  const leadStatuses = ['new','contacted','quoted','accepted','rejected'];
  for (let i = 0; i < 20; i++) {
    const fname = rand(ROMANIAN_FIRST_NAMES);
    const lname = rand(ROMANIAN_LAST_NAMES);
    const compName = rand(COMPANIES_RO) + ' ' + String.fromCharCode(65 + i % 26);
    try {
      await client.query(`
        INSERT INTO leads (id, name, email, phone, company, status, notes, "createdAt", "updatedAt", "companyId")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT DO NOTHING
      `, [
        uuid(), fname + ' ' + lname,
        fname.toLowerCase() + '.' + lname.toLowerCase() + '@' + compName.toLowerCase().replace(/\s/g,'').replace(/[^a-z0-9]/g,'') + '.ro',
        phoneRO(), compName, rand(leadStatuses),
        'Interesat de servicii transport internațional. Volum estimat ' + randInt(10,100) + ' curse/an.',
        new Date(randDate('2024-01-01','2026-09-01')), new Date(), companyId
      ]);
    } catch(e) {
      console.log(`  ⚠️ lead ${i}: ${e.message}`);
    }
  }
  console.log('  ✅ Inserted leads');

  // ---- CUSTOMER CONTACTS ----
  console.log('📦 Inserting CUSTOMER CONTACTS...');
  for (let i = 0; i < 20; i++) {
    const custId = customerIds[i % customerIds.length];
    if (!custId) continue;
    const fname = rand(ROMANIAN_FIRST_NAMES);
    const lname = rand(ROMANIAN_LAST_NAMES);
    try {
      await client.query(`
        INSERT INTO customer_contacts (id, "customerId", "firstName", "lastName", email, phone, position, "isPrimary", notes, "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT DO NOTHING
      `, [
        uuid(), custId, fname, lname,
        fname.toLowerCase() + '@client.ro', phoneRO(),
        rand(['Director','Manager Logistică','Responsabil Aprovizionare','Contabil','Director Comercial']),
        i === 0 || Math.random() < 0.3, 'Contact principal pentru comenzi.',
        new Date(), new Date()
      ]);
    } catch(e) {
      console.log(`  ⚠️ customer_contact ${i}: ${e.message}`);
    }
  }
  console.log('  ✅ Inserted customer contacts');

  // ---- CUSTOMER LOCATIONS ----
  console.log('📦 Inserting CUSTOMER LOCATIONS...');
  for (let i = 0; i < 20; i++) {
    const custId = customerIds[i % customerIds.length];
    if (!custId) continue;
    const city = rand(CITIES_EU);
    try {
      await client.query(`
        INSERT INTO customer_locations (id, "customerId", name, address, city, country, "postalCode", lat, lng, "isDefault", "locationType", notes, "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        ON CONFLICT DO NOTHING
      `, [
        uuid(), custId,
        city + ' - ' + rand(['Sediu Principal','Depozit','Sucursală','Punct de Lucru']),
        'Str. ' + rand(['Industriilor','Comercială','Logistică','Producției']) + ' nr.' + randInt(1,100),
        city, rand(COUNTRIES.slice(0,5)),
        randInt(100000,999999).toString(),
        randFloat(43,55,4), randFloat(20,30,4),
        i === 0,
        rand(['pickup','delivery','both']),
        'Acces TIR. Program L-V 08:00-17:00.',
        new Date(), new Date()
      ]);
    } catch(e) {
      console.log(`  ⚠️ customer_location ${i}: ${e.message}`);
    }
  }
  console.log('  ✅ Inserted customer locations');

  // ---- DRIVER DOCUMENTS ----
  console.log('📦 Inserting DRIVER DOCUMENTS...');
  const docTypes = ['license','passport','medical_cert','adr_cert','cpc_cert','id_card','other'];
  for (let i = 0; i < 20; i++) {
    const driverId = driverIds[i % driverIds.length];
    if (!driverId) continue;
    const expiryDate = randDate('2025-01-01','2030-12-31');
    try {
      await client.query(`
        INSERT INTO driver_documents (id, "driverId", type, "documentNumber", "expiryDate", "isVerified", notes, "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT DO NOTHING
      `, [
        uuid(), driverId, rand(docTypes),
        String.fromCharCode(65 + randInt(0,25)) + String.fromCharCode(65 + randInt(0,25)) + randInt(100000,999999),
        expiryDate, Math.random() < 0.8,
        'Document verificat și valid.',
        new Date(), new Date()
      ]);
    } catch(e) {
      console.log(`  ⚠️ driver_document ${i}: ${e.message}`);
    }
  }
  console.log('  ✅ Inserted driver documents');

  // ---- TRUCK DOCUMENTS ----
  console.log('📦 Inserting TRUCK DOCUMENTS...');
  const truckDocTypes = ['registration','insurance_rca','insurance_casco','vignette_ro','vignette_de','vignette_at','vignette_cz','itp','other'];
  for (let i = 0; i < 20; i++) {
    const truckId = truckIds[i % truckIds.length];
    if (!truckId) continue;
    try {
      await client.query(`
        INSERT INTO truck_documents (id, "truckId", type, "documentNumber", "expiryDate", "isVerified", notes, "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT DO NOTHING
      `, [
        uuid(), truckId, rand(truckDocTypes),
        'DOC-' + randInt(100000,999999),
        randDate('2025-01-01','2030-12-31'),
        Math.random() < 0.9,
        'Document valabil. Reînnoire înainte de expirare.',
        new Date(), new Date()
      ]);
    } catch(e) {
      console.log(`  ⚠️ truck_document ${i}: ${e.message}`);
    }
  }
  console.log('  ✅ Inserted truck documents');

  // ---- STOPS ----
  console.log('📦 Inserting STOPS...');
  const stopIds = [];
  const stopTypes = ['pickup','delivery','custom'];
  for (let i = 0; i < 20; i++) {
    const id = uuid();
    stopIds.push(id);
    const orderId = orderIds[i % orderIds.length];
    const tripId = tripIds[i % tripIds.length];
    const city = rand(CITIES_EU);
    try {
      await client.query(`
        INSERT INTO stops (id, type, address, city, country, lat, lng, "scheduledTime", "actualTime", notes, "orderId", "tripId", "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        ON CONFLICT DO NOTHING
      `, [
        id, rand(stopTypes),
        'Str. ' + rand(['Industriilor','Comercială','Logistică']) + ' nr.' + randInt(1,100),
        city, rand(COUNTRIES),
        randFloat(43,55,4), randFloat(20,30,4),
        new Date(randDate('2024-01-01','2026-09-01')),
        Math.random() < 0.6 ? new Date(randDate('2024-01-01','2026-09-12')) : null,
        'Oprire planificată. Contact la fața locului.',
        orderId || null, tripId || null,
        new Date(), new Date()
      ]);
    } catch(e) {
      console.log(`  ⚠️ stop ${i}: ${e.message}`);
    }
  }
  console.log(`  ✅ Inserted ${stopIds.length} stops`);

  // ---- SETTLEMENTS ----
  console.log('📦 Inserting SETTLEMENTS...');
  const settlementStatuses = ['draft','approved','paid'];
  for (let i = 0; i < 20; i++) {
    const driverId = driverIds[i % driverIds.length];
    const tripId = tripIds[i % tripIds.length];
    const month = months[i % months.length];
    try {
      await client.query(`
        INSERT INTO settlements (id, month, status, "totalEarnings", "totalDeductions", "netAmount", currency, notes, "createdAt", "updatedAt", "companyId", "driverId", "tripId")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT DO NOTHING
      `, [
        uuid(), month, rand(settlementStatuses),
        randFloat(2000,8000,2), randFloat(100,500,2), randFloat(1500,7500,2),
        'EUR', 'Decontare lunară șofer.',
        new Date(), new Date(), companyId,
        driverId || null, tripId || null
      ]);
    } catch(e) {
      console.log(`  ⚠️ settlement ${i}: ${e.message}`);
    }
  }
  console.log('  ✅ Inserted settlements');

  // ---- DISPATCHER USERS ----
  console.log('📦 Inserting DISPATCHER users...');
  for (let i = 0; i < 5; i++) {
    const fname = rand(ROMANIAN_FIRST_NAMES);
    const lname = rand(ROMANIAN_LAST_NAMES);
    try {
      await client.query(`
        INSERT INTO users (id, email, first_name, last_name, password_hash, status, email_verified, role, "isActive", "companyId", "createdAt", "updatedAt", "grossSalary", "dailyRate", language)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT DO NOTHING
      `, [
        uuid(), `dispecer${i+1}@hapcargo.ro`, fname, lname,
        '$2b$10$hashedpasswordplaceholder123456789012345678901234567',
        'active', true, 'dispatcher', true, companyId,
        new Date(), new Date(),
        randFloat(4000,9000,0).toString(), '0', 'ro'
      ]);
    } catch(e) {
      console.log(`  ⚠️ dispatcher user ${i}: ${e.message}`);
    }
  }
  console.log('  ✅ Inserted dispatcher users');

  console.log('\n🎉 ALL DATA POPULATED SUCCESSFULLY!');
  console.log('Summary:');
  console.log(`  - ${clientIds.length} clients`);
  console.log(`  - ${customerIds.length} customers`);
  console.log(`  - ${driverIds.length} drivers`);
  console.log(`  - ${truckIds.length} trucks`);
  console.log(`  - ${trailerIds.length} trailers`);
  console.log(`  - ${tripIds.length} trips`);
  console.log(`  - ${orderIds.length} orders`);
  console.log(`  - ${invoiceIds.length} invoices`);
  console.log('  - 20 expenses, 20 payments, 20 maintenance, 20 payrolls, 20 trip_costs');
  console.log('  - 20 shipments, 20 stops, 20 notifications, 20 leads, 20 settlements');
  console.log('  - Plus: cargo_items, invoice_items, customer_contacts, customer_locations, driver_documents, truck_documents');

  await client.end();
}

main().catch(e => { console.error('❌ Fatal error:', e.message, e.stack); process.exit(1); });
