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

const FIRST_NAMES = ['Alexandru','Andrei','Bogdan','Catalin','Daniel','Florin','Gabriel','Ion','Liviu','Marius','Mihai','Nicolae','Radu','Sebastian','Stefan','Vasile','Victor','Vlad','Adrian','Cristian','Dumitru','Emil','Felix','Gelu','Horatiu'];
const LAST_NAMES = ['Popescu','Ionescu','Popa','Stan','Stoica','Gheorghe','Moldovan','Munteanu','Constantin','Dima','Florea','Dumitrescu','Badea','Niculescu','Serban','Preda','Nica','Draghici','Grigore','Matei'];
const COMPANIES = ['TransRo SRL','EuroTrans SA','CargoSpeed SRL','LogiRom SRL','FastFreight SRL','RomCargo SA','BalticTrans SRL','DunaTrans SRL','ExpresCargo SRL','PolyTrans SRL','AgriTrans SRL','TerraLogistics SRL','FlexiCargo SA','OmniFret SRL','TransCarpat SRL'];
const CITIES = ['București','Cluj-Napoca','Timișoara','Brașov','Constanța','Iași','Craiova','Galați','Ploiești','Oradea','Sibiu','Bacău','Arad','Pitești','Hamburg','München','Berlin','Frankfurt','Wien','Praga','Varșovia','Bratislava','Budapest','Sofia','Belgrad'];
const COUNTRIES = ['RO','DE','AT','CZ','PL','SK','HU','BG','NL','FR'];
const CARGO_NAMES = ['Mobilă','Produse alimentare','Materiale de construcții','Piese auto','Produse cosmetice','Textile','Echipamente electrice','Chimicale','Hârtie','Produse farmaceutice','Componente industriale','Produse din plastic','Materiale agricole','Echipamente IT','Produse metalice'];
const TRUCK_BRANDS = ['Volvo','Scania','Mercedes-Benz','DAF','MAN','Iveco','Renault','Ford'];
const TRUCK_MODELS = { 'Volvo':['FH16','FH 500','FM 450','FMX 460'], 'Scania':['R500','R450','R410','S500'], 'Mercedes-Benz':['Actros 1845','Actros 1848','Arocs 2040'], 'DAF':['XF 480','XF 530','CF 340'], 'MAN':['TGX 26.500','TGX 18.460','TGS 26.440'], 'Iveco':['S-WAY 480','STRALIS 460','TRAKKER 440'], 'Renault':['T520','T480','C480'], 'Ford':['F-MAX 500','CARGO 1848'] };
const TRAILER_MAKES = ['Schmitz','Krone','Kögel','Wielton','Fliegl','Renders','Schwarzmüller'];
function phoneRO() { return '+407' + randInt(10,99) + randInt(100000,999999); }
function plateRO() {
  const counties = ['B','CJ','TM','BV','CT','IS','DJ','GL','PH','BH','SB','BC','AR','AG','MM','BN','CS','CV','DB','GR'];
  return rand(counties) + randInt(10,99) + String.fromCharCode(65+randInt(0,25)) + String.fromCharCode(65+randInt(0,25)) + String.fromCharCode(65+randInt(0,25));
}
function vatRO() { return 'RO' + randInt(10000000,99999999); }

async function main() {
  await client.connect();
  console.log('✅ Connected to database');

  const companyRes = await client.query(`SELECT id FROM companies LIMIT 1`);
  const companyId = companyRes.rows[0]?.id;
  console.log('CompanyId:', companyId);

  if (!companyId) { console.log('❌ No company found!'); await client.end(); return; }

  // ============================================================
  // CLIENTS (fresh - correct schema from inspection)
  // ============================================================
  console.log('\n📦 [1/17] CLIENTS...');
  const clientIds = [];
  const clientColsRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='clients' ORDER BY ordinal_position`);
  const clientCols = clientColsRes.rows.map(r => r.column_name);
  console.log('  Client columns:', clientCols.join(', '));

  // Simple insert matching whatever columns exist
  for (let i = 0; i < 20; i++) {
    const id = uuid();
    clientIds.push(id);
    const name = COMPANIES[i % COMPANIES.length] + (i >= 15 ? ' ' + (i-14) : '');
    const fname = rand(FIRST_NAMES), lname = rand(LAST_NAMES);
    try {
      // Try full insert
      const cols_to_try = ['id','name','email','phone','address','city','country','vatNumber','contactPerson','notes','isActive','createdAt','updatedAt','companyId'];
      const existing = cols_to_try.filter(c => clientCols.includes(c));
      const vals = existing.map((c, idx) => {
        if (c==='id') return id;
        if (c==='name') return name;
        if (c==='email') return `contact@${name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'').substring(0,20)}.ro`;
        if (c==='phone') return phoneRO();
        if (c==='address') return `Str. ${rand(['Mihai Eminescu','Nicolae Bălcescu','Independenței'])} nr.${randInt(1,99)}`;
        if (c==='city') return rand(CITIES.slice(0,10));
        if (c==='country') return rand(COUNTRIES.slice(0,3));
        if (c==='vatNumber') return vatRO();
        if (c==='contactPerson') return fname + ' ' + lname;
        if (c==='notes') return 'Client activ. ' + randInt(1,10) + ' ani colaborare.';
        if (c==='isActive') return true;
        if (c==='createdAt'||c==='updatedAt') return new Date();
        if (c==='companyId') return companyId;
        return null;
      });
      const placeholders = vals.map((_, idx) => `$${idx+1}`).join(',');
      const colsQuoted = existing.map(c => `"${c}"`).join(',');
      await client.query(`INSERT INTO clients (${colsQuoted}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`, vals);
    } catch(e) {
      console.log(`  ⚠️ client ${i}: ${e.message.substring(0,100)}`);
    }
  }
  const cliCount = (await client.query(`SELECT COUNT(*) FROM clients`)).rows[0].count;
  console.log(`  ✅ clients: ${cliCount} rows`);

  // ============================================================
  // DRIVERS
  // ============================================================
  console.log('\n📦 [2/17] DRIVERS...');
  const driverIds = [];
  const drvColsRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='drivers' ORDER BY ordinal_position`);
  const drvCols = drvColsRes.rows.map(r => r.column_name);
  console.log('  Driver columns:', drvCols.slice(0,15).join(', '), '...');

  const driverStatuses = ['available','in_trip','off','sick','vacation'];
  for (let i = 0; i < 20; i++) {
    const id = uuid();
    driverIds.push(id);
    const fname = FIRST_NAMES[i % FIRST_NAMES.length];
    const lname = LAST_NAMES[i % LAST_NAMES.length];
    
    const vals = { id, firstName: fname, lastName: lname, email: `sofer${i+1}@hapcargo.ro`,
      phone: phoneRO(), status: rand(driverStatuses),
      licenseNumber: 'B-' + randInt(100000,999999),
      licenseExpiry: new Date(randDate('2025-01-01','2030-12-31')),
      nationality: rand(['RO','BG','PL','UA','MD']),
      dateOfBirth: new Date(randDate('1970-01-01','2000-12-31')),
      address: `Str. ${rand(['Primăverii','Toamnei','Iernii','Verii'])} nr.${randInt(1,100)}`,
      city: rand(CITIES.slice(0,10)), country: 'RO',
      postalCode: randInt(100000,999999).toString(),
      emergencyContact: rand(FIRST_NAMES) + ' ' + rand(LAST_NAMES),
      emergencyPhone: phoneRO(),
      notes: `Șofer cu ${randInt(2,20)} ani experiență. Rute internaționale.`,
      isActive: true, createdAt: new Date(), updatedAt: new Date(),
      companyId, grossSalary: randFloat(3000,7000,2), dailyRate: randFloat(80,130,2)
    };
    
    const existingCols = Object.keys(vals).filter(k => drvCols.includes(k));
    const existingVals = existingCols.map(k => vals[k]);
    const placeholders = existingVals.map((_, idx) => `$${idx+1}`).join(',');
    const colsQuoted = existingCols.map(c => `"${c}"`).join(',');
    
    try {
      await client.query(`INSERT INTO drivers (${colsQuoted}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`, existingVals);
    } catch(e) {
      console.log(`  ⚠️ driver ${i}: ${e.message.substring(0,120)}`);
    }
  }
  const drvCount = (await client.query(`SELECT COUNT(*) FROM drivers`)).rows[0].count;
  console.log(`  ✅ drivers: ${drvCount} rows`);
  const driverIdsDB = (await client.query(`SELECT id FROM drivers LIMIT 25`)).rows.map(r => r.id);

  // ============================================================
  // TRAILERS (before trucks because trucks.trailerId FK -> trailers)
  // ============================================================
  console.log('\n📦 [3/17] TRAILERS...');
  const trailerIds = [];
  const trlColsRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='trailers' ORDER BY ordinal_position`);
  const trlCols = trlColsRes.rows.map(r => r.column_name);
  console.log('  Trailer columns:', trlCols.join(', '));

  const trailerTypes = ['mega','frigo','standard','walking_floor','container','flatbed','other'];
  const trailerStatuses = ['active','maintenance','inactive'];
  for (let i = 0; i < 20; i++) {
    const id = uuid();
    trailerIds.push(id);
    const make = rand(TRAILER_MAKES);
    
    const vals = { id,
      licensePlate: plateRO(), make,
      model: make + ' ' + rand(['Curtainsider','Mega','Reefer','Tipper','Flatbed']),
      year: randInt(2015,2024), type: rand(trailerTypes), status: rand(trailerStatuses),
      payloadCapacity: randFloat(20000,24000,0),
      maxWeightKg: randFloat(36000,44000,0), ldm: randFloat(12,13.6,1),
      volumeCbm: randFloat(80,100,0), pallets: randInt(33,34),
      createdAt: new Date(), updatedAt: new Date(), companyId,
      // snake_case variants
      payload_capacity: randFloat(20000,24000,0)
    };
    
    const existingCols = Object.keys(vals).filter(k => trlCols.includes(k));
    const existingVals = existingCols.map(k => vals[k]);
    const placeholders = existingVals.map((_, idx) => `$${idx+1}`).join(',');
    const colsQuoted = existingCols.map(c => `"${c}"`).join(',');
    
    try {
      await client.query(`INSERT INTO trailers (${colsQuoted}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`, existingVals);
    } catch(e) {
      console.log(`  ⚠️ trailer ${i}: ${e.message.substring(0,120)}`);
    }
  }
  const trlCount = (await client.query(`SELECT COUNT(*) FROM trailers`)).rows[0].count;
  console.log(`  ✅ trailers: ${trlCount} rows`);
  const trailerIdsDB = (await client.query(`SELECT id FROM trailers LIMIT 25`)).rows.map(r => r.id);

  // ============================================================
  // TRUCKS
  // ============================================================
  console.log('\n📦 [4/17] TRUCKS...');
  const truckIds = [];
  const trkColsRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='trucks' ORDER BY ordinal_position`);
  const trkCols = trkColsRes.rows.map(r => r.column_name);
  console.log('  Truck columns:', trkCols.join(', '));

  const truckStatuses = ['active','in_trip','maintenance','inactive'];
  for (let i = 0; i < 20; i++) {
    const id = uuid();
    truckIds.push(id);
    const brand = rand(TRUCK_BRANDS);
    const model = rand(TRUCK_MODELS[brand] || ['Model X']);
    const trailerId = trailerIdsDB[i % Math.max(trailerIdsDB.length,1)] || null;
    const driverId = driverIdsDB[i % Math.max(driverIdsDB.length,1)] || null;
    
    const vals = { id, licensePlate: plateRO(), brand, model,
      year: randInt(2018,2024), truckType: rand(['mega','standard','frigo']),
      euronorm: rand(['EURO5','EURO6','EURO6c']),
      payloadCapacity: randFloat(20000,24000,0), maxWeightKg: randFloat(40000,44000,0),
      maxLdm: randFloat(12,13.6,1), maxVolumeCbm: randFloat(80,100,0), maxPallets: randInt(33,34),
      loadingAccess: rand(['rear_only','side_only','rear_and_side','full_access']),
      loadingRule: rand(['lifo','fifo','flexible']),
      costPerKm: randFloat(1.2,2.5,2), fuelConsumption: randFloat(28,38,1),
      status: rand(truckStatuses),
      currentLat: randFloat(43,55,4), currentLng: randFloat(20,30,4),
      totalMileage: randFloat(100000,800000,0), nextMaintenanceMileage: randFloat(50000,150000,0),
      createdAt: new Date(), updatedAt: new Date(), companyId,
      driverId, trailerId
    };
    
    const existingCols = Object.keys(vals).filter(k => trkCols.includes(k));
    const existingVals = existingCols.map(k => vals[k]);
    const placeholders = existingVals.map((_, idx) => `$${idx+1}`).join(',');
    const colsQuoted = existingCols.map(c => `"${c}"`).join(',');
    
    try {
      await client.query(`INSERT INTO trucks (${colsQuoted}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`, existingVals);
    } catch(e) {
      console.log(`  ⚠️ truck ${i}: ${e.message.substring(0,120)}`);
    }
  }
  const trkCount = (await client.query(`SELECT COUNT(*) FROM trucks`)).rows[0].count;
  console.log(`  ✅ trucks: ${trkCount} rows`);
  const truckIdsDB = (await client.query(`SELECT id FROM trucks LIMIT 25`)).rows.map(r => r.id);

  // ============================================================
  // TRIPS
  // ============================================================
  console.log('\n📦 [5/17] TRIPS...');
  const tripIds = [];
  const trpColsRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='trips' ORDER BY ordinal_position`);
  const trpCols = trpColsRes.rows.map(r => r.column_name);
  console.log('  Trip columns:', trpCols.join(', '));

  const tripStatuses = ['planned','in_progress','completed','cancelled'];
  for (let i = 0; i < 20; i++) {
    const id = uuid();
    tripIds.push(id);
    const depCity = rand(CITIES);
    const arrCity = rand(CITIES.filter(c => c !== depCity));
    const depDate = randDate('2024-01-01','2026-09-01');
    const arrDate = new Date(depDate.getTime() + randInt(1,5) * 24 * 3600 * 1000);
    const distKm = randFloat(200,2500,0);
    const truckId = truckIdsDB[i % Math.max(truckIdsDB.length,1)] || null;
    const driverId = driverIdsDB[i % Math.max(driverIdsDB.length,1)] || null;
    const trailerId = trailerIdsDB[i % Math.max(trailerIdsDB.length,1)] || null;
    
    const vals = { id, status: rand(tripStatuses),
      departureCity: depCity, arrivalCity: arrCity,
      departureDate: depDate, arrivalDate: arrDate,
      estimatedKm: distKm, actualKm: distKm * randFloat(0.95,1.05),
      loadingMeters: randFloat(5,13.6,1), totalWeight: randFloat(5000,24000,0),
      notes: `Cursă ${depCity} → ${arrCity}. Marfă paletizată.`,
      createdAt: new Date(), updatedAt: new Date(), companyId,
      truckId, driverId, trailerId,
      // snake_case alternatives
      departure_city: depCity, arrival_city: arrCity
    };
    
    const existingCols = Object.keys(vals).filter(k => trpCols.includes(k));
    const existingVals = existingCols.map(k => vals[k]);
    const placeholders = existingVals.map((_, idx) => `$${idx+1}`).join(',');
    const colsQuoted = existingCols.map(c => `"${c}"`).join(',');
    
    try {
      await client.query(`INSERT INTO trips (${colsQuoted}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`, existingVals);
    } catch(e) {
      console.log(`  ⚠️ trip ${i}: ${e.message.substring(0,120)}`);
    }
  }
  const trpCount = (await client.query(`SELECT COUNT(*) FROM trips`)).rows[0].count;
  console.log(`  ✅ trips: ${trpCount} rows`);
  const tripIdsDB = (await client.query(`SELECT id FROM trips LIMIT 25`)).rows.map(r => r.id);

  // ============================================================
  // MAINTENANCE
  // ============================================================
  console.log('\n📦 [6/17] MAINTENANCE...');
  const maintTypes = ['preventive','corrective','inspection'];
  const maintStatuses = ['scheduled','in_progress','done'];
  for (let i = 0; i < 20; i++) {
    const truckId = truckIdsDB[i % Math.max(truckIdsDB.length,1)] || null;
    const schedDate = randDate('2024-01-01','2026-12-31');
    const doneDate = new Date(schedDate.getTime() + randInt(1,5) * 24 * 3600 * 1000);
    try {
      await client.query(`
        INSERT INTO maintenance (id, type, description, "scheduledDate", "completedDate", cost, "partsCost", "laborCost", "odometerKm", "serviceProvider", status, notes, "createdAt", "updatedAt", "truckId")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT DO NOTHING
      `, [
        uuid(), rand(maintTypes),
        rand(['Schimb ulei și filtru','Revizie completă','Înlocuire plăcuțe frână','Verificare sistem ABS','Schimb anvelope','Reparație motor','Verificare tahograf','Verificare frâne']),
        schedDate, doneDate,
        randFloat(200,5000,2), randFloat(100,2000,2), randFloat(100,1500,2),
        randInt(100000,800000),
        rand(['Service TIR SRL','AutoPro Service','TruckFix Center','MotoService Rapid','DAF Service Center']),
        rand(maintStatuses),
        'Efectuată conform planificării. Toate piesele au fost înlocuite.',
        new Date(), new Date(), truckId
      ]);
    } catch(e) { console.log(`  ⚠️ maintenance ${i}: ${e.message.substring(0,100)}`); }
  }
  const mntCount = (await client.query(`SELECT COUNT(*) FROM maintenance`)).rows[0].count;
  console.log(`  ✅ maintenance: ${mntCount} rows`);

  // ============================================================
  // INVOICES
  // ============================================================
  console.log('\n📦 [7/17] INVOICES...');
  const invoiceIds = [];
  const invColsRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='invoices' ORDER BY ordinal_position`);
  const invCols = invColsRes.rows.map(r => r.column_name);
  const orderIdsDB = (await client.query(`SELECT id FROM orders LIMIT 25`)).rows.map(r => r.id);
  const customerIdsDB = (await client.query(`SELECT id FROM customers LIMIT 25`)).rows.map(r => r.id);
  const clientIdsDB = (await client.query(`SELECT id FROM clients LIMIT 25`)).rows.map(r => r.id);
  
  const invStatuses = ['draft','approved','sent','viewed','paid','overdue','cancelled'];
  const vatTypes = ['NORMAL','REVERSE_CHARGE','EXEMPT'];
  for (let i = 0; i < 20; i++) {
    const id = uuid();
    invoiceIds.push(id);
    const issueDate = randDate('2024-01-01','2026-09-01');
    const dueDate = new Date(issueDate.getTime() + 30 * 24 * 3600 * 1000);
    const subtotal = randFloat(500,10000,2);
    const vat = randFloat(0,subtotal * 0.19,2);
    const orderId = orderIdsDB[i % Math.max(orderIdsDB.length,1)] || null;
    const customerId = customerIdsDB[i % Math.max(customerIdsDB.length,1)] || null;
    const clientId = clientIdsDB[i % Math.max(clientIdsDB.length,1)] || null;

    const vals = { id,
      invoiceNumber: 'FACT-' + String(2024000 + i + 1), status: rand(invStatuses),
      vatType: rand(vatTypes), issueDate, dueDate,
      subtotal, vatAmount: vat, total: subtotal + vat, currency: 'EUR',
      notes: `Factură transport ${rand(CARGO_NAMES)}. Termen plată 30 zile.`,
      createdAt: new Date(), updatedAt: new Date(), companyId,
      customerId, clientId, orderId,
      // snake_case variants
      invoice_number: 'FACT-' + String(2024000 + i + 1),
      customer_id: customerId, order_id: orderId
    };
    
    const existingCols = Object.keys(vals).filter(k => invCols.includes(k));
    const existingVals = existingCols.map(k => vals[k]);
    const placeholders = existingVals.map((_, idx) => `$${idx+1}`).join(',');
    const colsQuoted = existingCols.map(c => `"${c}"`).join(',');
    
    try {
      await client.query(`INSERT INTO invoices (${colsQuoted}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`, existingVals);
    } catch(e) { console.log(`  ⚠️ invoice ${i}: ${e.message.substring(0,120)}`); }
  }
  const invCount = (await client.query(`SELECT COUNT(*) FROM invoices`)).rows[0].count;
  console.log(`  ✅ invoices: ${invCount} rows`);
  const invoiceIdsDB = (await client.query(`SELECT id FROM invoices LIMIT 25`)).rows.map(r => r.id);

  // ============================================================
  // EXPENSES
  // ============================================================
  console.log('\n📦 [8/17] EXPENSES...');
  const expColsRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='expenses' ORDER BY ordinal_position`);
  const expCols = expColsRes.rows.map(r => r.column_name);
  const expCategories = ['fuel','maintenance','accounting','salary','toll','other'];
  const expDescriptions = ['Motorină A1','Taxă autostradă','Reparație motor','Schimb anvelope','Asigurare RCA','Vignietă DE','Vignietă AT','Parcare TIR','Spălare camion','Piese schimb'];
  
  for (let i = 0; i < 20; i++) {
    const cat = rand(expCategories);
    const tripId = tripIdsDB[i % Math.max(tripIdsDB.length,1)] || null;
    const truckId = truckIdsDB[i % Math.max(truckIdsDB.length,1)] || null;
    const driverId = driverIdsDB[i % Math.max(driverIdsDB.length,1)] || null;
    const amounts = { fuel:randFloat(200,1200,2), maintenance:randFloat(300,3000,2), accounting:randFloat(100,500,2), salary:randFloat(3000,8000,2), toll:randFloat(30,300,2), other:randFloat(50,500,2) };

    const vals = { id: uuid(), category: cat, amount: amounts[cat], currency: 'EUR',
      description: rand(expDescriptions), date: new Date(randDate('2024-01-01','2026-09-01')),
      createdAt: new Date(), updatedAt: new Date(), companyId,
      tripId, truckId, driverId,
      // alternatives
      trip_id: tripId, truck_id: truckId, driver_id: driverId
    };
    
    const existingCols = Object.keys(vals).filter(k => expCols.includes(k));
    const existingVals = existingCols.map(k => vals[k]);
    const placeholders = existingVals.map((_, idx) => `$${idx+1}`).join(',');
    const colsQuoted = existingCols.map(c => `"${c}"`).join(',');
    
    try {
      await client.query(`INSERT INTO expenses (${colsQuoted}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`, existingVals);
    } catch(e) { console.log(`  ⚠️ expense ${i}: ${e.message.substring(0,120)}`); }
  }
  const expCount = (await client.query(`SELECT COUNT(*) FROM expenses`)).rows[0].count;
  console.log(`  ✅ expenses: ${expCount} rows`);

  // ============================================================
  // PAYMENTS (correct schema)
  // ============================================================
  console.log('\n📦 [9/17] PAYMENTS...');
  const paymentMethods = ['bank_transfer','cash','card','check'];
  for (let i = 0; i < 20; i++) {
    const invId = invoiceIdsDB[i % Math.max(invoiceIdsDB.length,1)] || null;
    const customerId = customerIdsDB[i % Math.max(customerIdsDB.length,1)] || null;
    try {
      await client.query(`
        INSERT INTO payments (id, company_id, invoice_id, customer_id, amount, method, reference, received_at, date, "createdAt", "updatedAt", "invoiceId", status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT DO NOTHING
      `, [
        uuid(), companyId, invId, customerId,
        randFloat(500,10000,2).toString(),
        rand(paymentMethods),
        'REF-' + randInt(100000,999999),
        new Date(randDate('2024-01-01','2026-09-01')),
        new Date(randDate('2024-01-01','2026-09-01')),
        new Date(), new Date(), invId || null,
        rand(['pending','confirmed','failed'])
      ]);
    } catch(e) { console.log(`  ⚠️ payment ${i}: ${e.message.substring(0,120)}`); }
  }
  const payCount = (await client.query(`SELECT COUNT(*) FROM payments`)).rows[0].count;
  console.log(`  ✅ payments: ${payCount} rows`);

  // ============================================================
  // PAYROLLS (correct schema: month integer, year integer, userId)
  // ============================================================
  console.log('\n📦 [10/17] PAYROLLS...');
  const usersRes = await client.query(`SELECT id FROM users WHERE role='driver' OR role='dispatcher' LIMIT 25`);
  const userIds = usersRes.rows.map(r => r.id);
  const payrollStatuses = ['draft','paid','sent'];
  
  for (let i = 0; i < 20; i++) {
    const userId = userIds[i % Math.max(userIds.length,1)] || null;
    const gross = randFloat(3500,7000,2);
    const tax = randFloat(gross*0.35,gross*0.45,2);
    const net = gross - tax;
    const holiday = gross * 0.0804;
    const daily = randFloat(80,150,2);
    const days = randInt(18,23);
    const totalAllowance = daily * days;
    const bonus = randFloat(0,500,2);
    const deduction = randFloat(0,200,2);
    const totalNet = net + totalAllowance + bonus - deduction;
    const month = (i % 12) + 1;
    const year = i < 12 ? 2024 : 2025;
    
    try {
      await client.query(`
        INSERT INTO payrolls (id, month, year, "grossSalary", "taxAmount", "netSalary", "holidayAllowance", "dailyAllowance", "daysWorked", "totalAllowance", bonuses, deductions, "totalNetToPay", status, "createdAt", "updatedAt", "userId")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) ON CONFLICT DO NOTHING
      `, [
        uuid(), month, year, gross, tax, net, holiday, daily, days,
        totalAllowance, bonus, deduction, totalNet,
        rand(payrollStatuses), new Date(), new Date(), userId
      ]);
    } catch(e) { console.log(`  ⚠️ payroll ${i}: ${e.message.substring(0,120)}`); }
  }
  const prlCount = (await client.query(`SELECT COUNT(*) FROM payrolls`)).rows[0].count;
  console.log(`  ✅ payrolls: ${prlCount} rows`);

  // ============================================================
  // SHIPMENTS (correct schema)
  // ============================================================
  console.log('\n📦 [11/17] SHIPMENTS...');
  const shipStatuses = ['planned','assigned','picked_up','in_transit','delivered','completed','cancelled'];
  for (let i = 0; i < 20; i++) {
    const orderId = orderIdsDB[i % Math.max(orderIdsDB.length,1)] || 'ORD-PLACEHOLDER';
    const clientId = clientIdsDB[i % Math.max(clientIdsDB.length,1)] || null;
    const pickCity = rand(CITIES), delCity = rand(CITIES.filter(c => c !== pickCity));
    const pickDate = new Date(randDate('2024-01-01','2026-09-01'));
    const delDate = new Date(pickDate.getTime() + randInt(1,5) * 24 * 3600 * 1000);
    const twStart = new Date(pickDate.getTime() + 8 * 3600 * 1000);
    const twEnd = new Date(pickDate.getTime() + 18 * 3600 * 1000);
    try {
      await client.query(`
        INSERT INTO shipments (id, "companyId", "orderId", "clientId", status, priority,
          "pickupAddress", "pickupCompanyName", "pickupCity", "pickupCountry", "pickupLatitude", "pickupLongitude",
          "pickupDate", "pickupTimeWindowStart", "pickupTimeWindowEnd", "pickupTimeWindowSoft", "pickupDurationMinutes",
          "deliveryAddress", "deliveryCompanyName", "deliveryCity", "deliveryCountry", "deliveryLatitude", "deliveryLongitude",
          "deliveryDate", "deliveryTimeWindowStart", "deliveryTimeWindowEnd", "deliveryTimeWindowSoft", "deliveryDurationMinutes",
          pallets, "weightKg", "loadingMeters", "volumeCbm", stackable, "loadingRule", reference, notes,
          "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38)
        ON CONFLICT DO NOTHING
      `, [
        uuid(), companyId, orderId.toString(), clientId,
        rand(shipStatuses), randInt(1,5),
        `Str. Industriilor nr.${randInt(1,50)}`, rand(COMPANIES), pickCity, rand(COUNTRIES),
        randFloat(43,55,4), randFloat(20,30,4),
        pickDate, twStart, twEnd, true, randInt(30,120),
        `Bd. Unirii nr.${randInt(1,100)}`, rand(COMPANIES), delCity, rand(COUNTRIES),
        randFloat(43,55,4), randFloat(20,30,4),
        delDate, new Date(delDate.getTime() + 8*3600*1000), new Date(delDate.getTime() + 18*3600*1000), true, randInt(30,120),
        randFloat(1,34,1), randFloat(1000,24000,0), randFloat(2,13.6,1), randFloat(10,100,0),
        Math.random() < 0.7, rand(['lifo','fifo','flexible']),
        'REF-' + randInt(10000,99999), `Transport ${rand(CARGO_NAMES)}. Livrare la timp garantată.`,
        new Date(), new Date()
      ]);
    } catch(e) { console.log(`  ⚠️ shipment ${i}: ${e.message.substring(0,120)}`); }
  }
  const shpCount = (await client.query(`SELECT COUNT(*) FROM shipments`)).rows[0].count;
  console.log(`  ✅ shipments: ${shpCount} rows`);

  // ============================================================
  // LEADS (correct schema: from, to, weight, source)
  // ============================================================
  console.log('\n📦 [12/17] LEADS...');
  const leadStatuses = ['new','contacted','quoted','accepted','rejected'];
  for (let i = 0; i < 20; i++) {
    const fname = rand(FIRST_NAMES), lname = rand(LAST_NAMES);
    const fromCity = rand(CITIES), toCity = rand(CITIES.filter(c => c !== fromCity));
    try {
      await client.query(`
        INSERT INTO leads (id, name, phone, email, "from", "to", weight, type, notes, source, pallets, "estimatedPrice", status, "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT DO NOTHING
      `, [
        uuid(), fname + ' ' + lname, phoneRO(),
        fname.toLowerCase() + '.' + lname.toLowerCase() + randInt(1,99) + '@gmail.com',
        fromCity, toCity,
        randInt(500,24000).toString(),
        rand(['FTL','LTL','Groupage']),
        `Interesat de transport ${rand(CARGO_NAMES)} de la ${fromCity} la ${toCity}. Volum lunar ${randInt(5,50)} curse.`,
        rand(['website','referral','phone','email','linkedin']),
        randInt(1,34).toString(),
        randFloat(300,5000,0).toString(),
        rand(leadStatuses), new Date(), new Date()
      ]);
    } catch(e) { console.log(`  ⚠️ lead ${i}: ${e.message.substring(0,120)}`); }
  }
  const leadCount = (await client.query(`SELECT COUNT(*) FROM leads`)).rows[0].count;
  console.log(`  ✅ leads: ${leadCount} rows`);

  // ============================================================
  // CARGO ITEMS (correct schema)
  // ============================================================
  console.log('\n📦 [13/17] CARGO ITEMS...');
  const cargoUnits = ['pallet','package','box','crate','roll','machine','coil','container','other'];
  for (let i = 0; i < 20; i++) {
    const orderId = orderIdsDB[i % Math.max(orderIdsDB.length,1)] || null;
    try {
      await client.query(`
        INSERT INTO cargo_items (id, unit, description, "weightKg", "volumeCbm", ldm, "lengthCm", "widthCm", "heightCm", quantity, stackable, fragile, "requiresTemperatureControl", "insuredValue", currency, "createdAt", "updatedAt", "companyId", "orderId")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) ON CONFLICT DO NOTHING
      `, [
        uuid(), rand(cargoUnits),
        rand(CARGO_NAMES) + ' - lot ' + randInt(1,100),
        randFloat(100,24000,0), randFloat(1,100,2), randFloat(0.5,13.6,2),
        randFloat(80,120,0), randFloat(80,120,0), randFloat(50,250,0),
        randInt(1,33), Math.random() < 0.7, Math.random() < 0.2, Math.random() < 0.1,
        randFloat(1000,50000,0), 'EUR',
        new Date(), new Date(), companyId, orderId
      ]);
    } catch(e) { console.log(`  ⚠️ cargo_item ${i}: ${e.message.substring(0,120)}`); }
  }
  const cgCount = (await client.query(`SELECT COUNT(*) FROM cargo_items`)).rows[0].count;
  console.log(`  ✅ cargo_items: ${cgCount} rows`);

  // ============================================================
  // DRIVER DOCUMENTS (with correct IDs)
  // ============================================================
  console.log('\n📦 [14/17] DRIVER DOCUMENTS...');
  const driverDocTypes = ['license','passport','medical_cert','adr_cert','cpc_cert','id_card','other'];
  if (driverIdsDB.length > 0) {
    for (let i = 0; i < 20; i++) {
      const driverId = driverIdsDB[i % driverIdsDB.length];
      try {
        await client.query(`
          INSERT INTO driver_documents (id, type, "documentNumber", "expiryDate", "fileUrl", "createdAt", "driverId")
          VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING
        `, [
          uuid(), rand(driverDocTypes),
          String.fromCharCode(65+randInt(0,25))+String.fromCharCode(65+randInt(0,25))+randInt(100000,999999),
          new Date(randDate('2025-01-01','2030-12-31')), null, new Date(), driverId
        ]);
      } catch(e) { console.log(`  ⚠️ driver_doc ${i}: ${e.message.substring(0,100)}`); }
    }
  } else {
    console.log('  ⚠️ No drivers found, skipping driver documents');
  }
  const ddCount = (await client.query(`SELECT COUNT(*) FROM driver_documents`)).rows[0].count;
  console.log(`  ✅ driver_documents: ${ddCount} rows`);

  // ============================================================
  // TRUCK DOCUMENTS (with correct IDs)
  // ============================================================
  console.log('\n📦 [15/17] TRUCK DOCUMENTS...');
  const truckDocTypes = ['registration','insurance_rca','insurance_casco','vignette_ro','vignette_de','vignette_at','vignette_cz','itp','cmr_insurance','other'];
  if (truckIdsDB.length > 0) {
    for (let i = 0; i < 20; i++) {
      const truckId = truckIdsDB[i % truckIdsDB.length];
      try {
        await client.query(`
          INSERT INTO truck_documents (id, type, "documentNumber", "expiryDate", "fileUrl", "createdAt", "truckId")
          VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING
        `, [
          uuid(), rand(truckDocTypes),
          'DOC-' + randInt(100000,999999),
          new Date(randDate('2025-01-01','2030-12-31')), null, new Date(), truckId
        ]);
      } catch(e) { console.log(`  ⚠️ truck_doc ${i}: ${e.message.substring(0,100)}`); }
    }
  } else {
    console.log('  ⚠️ No trucks found, skipping truck documents');
  }
  const tdCount = (await client.query(`SELECT COUNT(*) FROM truck_documents`)).rows[0].count;
  console.log(`  ✅ truck_documents: ${tdCount} rows`);

  // ============================================================
  // CLIENT LOCATIONS & RATES (with correct IDs)
  // ============================================================
  console.log('\n📦 [16/17] CLIENT LOCATIONS & RATES...');
  const clientIdsDB2 = (await client.query(`SELECT id FROM clients LIMIT 25`)).rows.map(r => r.id);
  if (clientIdsDB2.length > 0) {
    for (let i = 0; i < 20; i++) {
      const clientId = clientIdsDB2[i % clientIdsDB2.length];
      const city = rand(CITIES);
      try {
        await client.query(`
          INSERT INTO client_locations (id, name, address, latitude, longitude, country, "contactPerson", phone, "timeZone", "createdAt", "updatedAt", "companyId", "clientId")
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT DO NOTHING
        `, [
          uuid(), city + ' - ' + rand(['Depozit','Sediu','Rampa','Punct Lucru']),
          `Str. ${rand(['Industriilor','Comercială','Logistică'])} nr.${randInt(1,100)}`,
          randFloat(43,55,4), randFloat(20,30,4), rand(COUNTRIES.slice(0,3)),
          rand(FIRST_NAMES) + ' ' + rand(LAST_NAMES), phoneRO(),
          rand(['Europe/Bucharest','Europe/Berlin','Europe/Warsaw']),
          new Date(), new Date(), companyId, clientId
        ]);
      } catch(e) { console.log(`  ⚠️ client_loc ${i}: ${e.message.substring(0,100)}`); }
    }
    
    for (let i = 0; i < 20; i++) {
      const clientId = clientIdsDB2[i % clientIdsDB2.length];
      const origCity = rand(CITIES), destCity = rand(CITIES.filter(c => c !== origCity));
      const validFrom = new Date(randDate('2024-01-01','2025-06-01'));
      const validUntil = new Date(validFrom.getTime() + 365 * 24 * 3600 * 1000);
      try {
        await client.query(`
          INSERT INTO client_rates (id, "rateName", "vehicleType", "priceType", "originCountry", "originCity", "destinationCountry", "destinationCity", "basePrice", currency, "fuelSurchargePercent", "tollIncluded", "validFrom", "validUntil", notes, active, "clientId")
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) ON CONFLICT DO NOTHING
        `, [
          uuid(), `${origCity} → ${destCity}`,
          rand(['mega','standard','frigo','walking_floor','flatbed']),
          rand(['per_km','flat_rate','per_trip']),
          rand(COUNTRIES), origCity, rand(COUNTRIES), destCity,
          randFloat(500,5000,2), 'EUR', randFloat(3,15,1), Math.random() < 0.5,
          validFrom, validUntil,
          'Tarif negociat. Valabil 1 an.',
          true, clientId
        ]);
      } catch(e) { console.log(`  ⚠️ client_rate ${i}: ${e.message.substring(0,100)}`); }
    }
  } else {
    console.log('  ⚠️ No clients, skipping client_locations & rates');
  }
  const clCount = (await client.query(`SELECT COUNT(*) FROM client_locations`)).rows[0].count;
  const crCount = (await client.query(`SELECT COUNT(*) FROM client_rates`)).rows[0].count;
  console.log(`  ✅ client_locations: ${clCount}, client_rates: ${crCount} rows`);

  // ============================================================
  // SETTLEMENTS with driver IDs
  // ============================================================
  console.log('\n📦 [17/17] SETTLEMENTS (with driver IDs)...');
  const existingSettCount = parseInt((await client.query(`SELECT COUNT(*) FROM settlements`)).rows[0].count);
  if (driverIdsDB.length > 0 && existingSettCount < 20) {
    const settStatuses = ['draft','approved','paid'];
    for (let i = 0; i < 20; i++) {
      const driverId = driverIdsDB[i % driverIdsDB.length];
      const gross = randFloat(3000,8000,2);
      const advances = randFloat(0,500,2);
      const deductions = randFloat(0,300,2);
      try {
        await client.query(`
          INSERT INTO settlements (id, "driverName", month, year, "payMode", "payRate", "tripCount", "totalDistance", "totalRevenue", "grossPay", advances, deductions, "netPay", status, notes, "createdAt", "updatedAt", "driverId")
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) ON CONFLICT DO NOTHING
        `, [
          uuid(), rand(FIRST_NAMES) + ' ' + rand(LAST_NAMES),
          (i % 12) + 1, i < 12 ? 2024 : 2025,
          rand(['per_km','flat_salary','per_trip','mixed']),
          randFloat(0.5,2.0,2), randInt(5,25),
          randFloat(2000,15000,0), randFloat(5000,20000,2),
          gross, advances, deductions, gross - advances - deductions,
          rand(settStatuses),
          'Decontare lunară.',
          new Date(), new Date(), driverId
        ]);
      } catch(e) { console.log(`  ⚠️ settlement ${i}: ${e.message.substring(0,100)}`); }
    }
  }
  const settCount = (await client.query(`SELECT COUNT(*) FROM settlements`)).rows[0].count;
  console.log(`  ✅ settlements: ${settCount} rows`);

  // ============================================================
  // FINAL SUMMARY
  // ============================================================
  console.log('\n═══════════════════════════════════════');
  console.log('📊 FINAL ROW COUNTS:');
  console.log('═══════════════════════════════════════');
  const finalTables = [
    'clients','customers','drivers','trucks','trailers','trips','orders',
    'invoices','expenses','payments','maintenance','payrolls','trip_costs',
    'shipments','stops','order_stops','settlements','notifications','leads',
    'driver_documents','truck_documents','client_locations','client_rates',
    'cargo_items','invoice_items'
  ];
  let allGood = true;
  for (const t of finalTables) {
    try {
      const r = await client.query(`SELECT COUNT(*) FROM "${t}"`);
      const count = parseInt(r.rows[0].count);
      const status = count >= 20 ? '✅' : count > 0 ? '⚠️ ' : '❌';
      if (count < 20) allGood = false;
      console.log(`  ${status} ${t.padEnd(25)} ${count} rows`);
    } catch(e) { console.log(`  ❓ ${t}: ${e.message.substring(0,60)}`); }
  }
  console.log('═══════════════════════════════════════');
  console.log(allGood ? '\n🎉 ALL TABLES HAVE 20+ ROWS!' : '\n⚠️  Some tables need attention');
  console.log('\n🔒 Admin accounts protected:');
  const admins = await client.query(`SELECT email, role FROM users WHERE role='admin'`);
  admins.rows.forEach(a => console.log(`  - ${a.email} (${a.role})`));

  await client.end();
}

main().catch(e => { console.error('❌ Fatal:', e.message, '\n', e.stack); process.exit(1); });
