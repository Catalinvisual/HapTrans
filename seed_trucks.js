const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway', ssl: { rejectUnauthorized: false } });
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min, max, dec = 2) { return parseFloat((Math.random() * (max - min) + min).toFixed(dec)); }
function randDate(start, end) { const s=new Date(start).getTime(),e=new Date(end).getTime(); return new Date(s+Math.random()*(e-s)); }
function uuid() { return require('crypto').randomUUID(); }
const FIRST_NAMES = ['Alexandru','Andrei','Bogdan','Catalin','Daniel','Florin','Gabriel','Ion','Liviu','Marius','Mihai','Nicolae'];
const LAST_NAMES = ['Popescu','Ionescu','Popa','Stan','Stoica','Gheorghe','Moldovan','Munteanu','Constantin','Dima'];
const TRUCK_BRANDS = ['Volvo','Scania','Mercedes-Benz','DAF','MAN','Iveco','Renault','Ford'];
const TRUCK_MODELS = { 'Volvo':['FH16','FH 500','FM 450','FMX 460'], 'Scania':['R500','R450','R410','S500'], 'Mercedes-Benz':['Actros 1845','Actros 1848','Arocs 2040'], 'DAF':['XF 480','XF 530','CF 340'], 'MAN':['TGX 26.500','TGX 18.460','TGS 26.440'], 'Iveco':['S-WAY 480','STRALIS 460'], 'Renault':['T520','T480'], 'Ford':['F-MAX 500','CARGO 1848'] };
const TRAILER_MAKES = ['Schmitz','Krone','Kögel','Wielton','Fliegl','Renders','Schwarzmüller'];
function plateRO() { const c=['B','CJ','TM','BV','CT','IS','DJ','GL','PH','BH','SB','BC','AR','AG','MM']; return rand(c)+randInt(10,99)+String.fromCharCode(65+randInt(0,25))+String.fromCharCode(65+randInt(0,25))+String.fromCharCode(65+randInt(0,25)); }

async function main() {
  await client.connect();
  console.log('✅ Connected');
  const companyRes = await client.query(`SELECT id FROM companies LIMIT 1`);
  const companyId = companyRes.rows[0]?.id;
  const driverIdsDB = (await client.query(`SELECT id FROM drivers LIMIT 25`)).rows.map(r => r.id);
  console.log(`Company: ${companyId}, Drivers: ${driverIdsDB.length}`);

  // ---- TRAILERS (plateNumber is the correct column) ----
  console.log('\n📦 TRAILERS...');
  const trailerIds = [];
  const trailerTypes = ['mega','frigo','standard','walking_floor','container','flatbed','other'];
  const trailerStatuses = ['active','maintenance','inactive'];
  for (let i = 0; i < 20; i++) {
    const id = uuid();
    trailerIds.push(id);
    const make = rand(TRAILER_MAKES);
    try {
      await client.query(`
        INSERT INTO trailers (id, "companyId", "plateNumber", type, brand, year, "payloadCapacityWeight", "maxLdm", "maxVolumeCbm", "payloadCapacityPallets", status, "apkExpiry", "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT DO NOTHING
      `, [
        id, companyId, plateRO(), rand(trailerTypes), make,
        randInt(2015,2024), randFloat(20000,24000,0), randFloat(12,13.6,1),
        randFloat(80,100,0), randInt(33,34), rand(trailerStatuses),
        new Date(randDate('2025-01-01','2030-12-31')),
        new Date(), new Date()
      ]);
    } catch(e) { console.log(`  ⚠️ trailer ${i}: ${e.message.substring(0,120)}`); }
  }
  const trlCount = (await client.query(`SELECT COUNT(*) FROM trailers`)).rows[0].count;
  console.log(`  ✅ trailers: ${trlCount} rows`);
  const trailerIdsDB = (await client.query(`SELECT id FROM trailers LIMIT 25`)).rows.map(r => r.id);

  // ---- TRUCKS (plateNumber, companyId) ----
  console.log('\n📦 TRUCKS...');
  const truckIds = [];
  const truckStatuses = ['active','in_trip','maintenance','inactive'];
  for (let i = 0; i < 20; i++) {
    const id = uuid();
    truckIds.push(id);
    const brand = rand(TRUCK_BRANDS);
    const model = rand(TRUCK_MODELS[brand] || ['Model X']);
    const trailerId = trailerIdsDB[i % Math.max(trailerIdsDB.length,1)] || null;
    const driverId = driverIdsDB[i % Math.max(driverIdsDB.length,1)] || null;
    try {
      await client.query(`
        INSERT INTO trucks (id, "companyId", "plateNumber", brand, model, year, "truckType", euronorm, "payloadCapacity", "maxWeightKg", "maxLdm", "maxVolumeCbm", "maxPallets", "loadingAccess", "loadingRule", "costPerKm", "fuelConsumption", status, "currentLat", "currentLng", "totalMileage", "nextMaintenanceMileage", "createdAt", "updatedAt", "driverId", "trailerId")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26) ON CONFLICT DO NOTHING
      `, [
        id, companyId, plateRO(), brand, model, randInt(2018,2024),
        rand(['mega','standard','frigo']), rand(['EURO5','EURO6','EURO6c']),
        randFloat(20000,24000,0), randFloat(40000,44000,0),
        randFloat(12,13.6,1), randFloat(80,100,0), randInt(33,34),
        rand(['rear_only','side_only','rear_and_side','full_access']),
        rand(['lifo','fifo','flexible']),
        randFloat(1.2,2.5,2), randFloat(28,38,1),
        rand(truckStatuses),
        randFloat(43,55,4), randFloat(20,30,4),
        randFloat(100000,800000,0), randFloat(50000,150000,0),
        new Date(), new Date(), driverId, trailerId
      ]);
    } catch(e) { console.log(`  ⚠️ truck ${i}: ${e.message.substring(0,120)}`); }
  }
  const trkCount = (await client.query(`SELECT COUNT(*) FROM trucks`)).rows[0].count;
  console.log(`  ✅ trucks: ${trkCount} rows`);
  const truckIdsDB = (await client.query(`SELECT id FROM trucks LIMIT 25`)).rows.map(r => r.id);

  // ---- TRUCK DOCUMENTS ----
  console.log('\n📦 TRUCK DOCUMENTS...');
  const truckDocTypes = ['registration','insurance_rca','insurance_casco','vignette_ro','vignette_de','vignette_at','vignette_cz','itp','cmr_insurance','other'];
  for (let i = 0; i < 20; i++) {
    const truckId = truckIdsDB[i % Math.max(truckIdsDB.length,1)];
    try {
      await client.query(`
        INSERT INTO truck_documents (id, type, "documentNumber", "expiryDate", "fileUrl", "createdAt", "truckId")
        VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING
      `, [uuid(), rand(truckDocTypes), 'DOC-'+randInt(100000,999999), new Date(randDate('2025-01-01','2030-12-31')), null, new Date(), truckId]);
    } catch(e) { console.log(`  ⚠️ truck_doc ${i}: ${e.message.substring(0,100)}`); }
  }
  const tdCount = (await client.query(`SELECT COUNT(*) FROM truck_documents`)).rows[0].count;
  console.log(`  ✅ truck_documents: ${tdCount} rows`);

  // ---- MAINTENANCE with truck IDs ----
  console.log('\n📦 Updating MAINTENANCE with truck IDs...');
  const existMaint = parseInt((await client.query(`SELECT COUNT(*) FROM maintenance WHERE "truckId" IS NOT NULL`)).rows[0].count);
  if (existMaint < 5 && truckIdsDB.length > 0) {
    const maintTypes = ['preventive','corrective','inspection'];
    const maintStatuses = ['scheduled','in_progress','done'];
    for (let i = 0; i < 20; i++) {
      const truckId = truckIdsDB[i % truckIdsDB.length];
      const schedDate = new Date(randDate('2024-01-01','2026-12-31'));
      try {
        await client.query(`
          INSERT INTO maintenance (id, type, description, "scheduledDate", "completedDate", cost, "partsCost", "laborCost", "odometerKm", "serviceProvider", status, notes, "createdAt", "updatedAt", "truckId")
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT DO NOTHING
        `, [
          uuid(), rand(maintTypes),
          rand(['Schimb ulei și filtru','Revizie completă','Înlocuire plăcuțe frână','Verificare ABS','Schimb anvelope','Verificare tahograf']),
          schedDate, new Date(schedDate.getTime() + randInt(1,5)*24*3600*1000),
          randFloat(200,5000,2), randFloat(100,2000,2), randFloat(100,1500,2),
          randInt(100000,800000), rand(['Service TIR SRL','AutoPro Service','TruckFix Center']),
          rand(maintStatuses), 'Efectuată conform planificării.',
          new Date(), new Date(), truckId
        ]);
      } catch(e) { console.log(`  ⚠️ maint ${i}: ${e.message.substring(0,100)}`); }
    }
  }
  const mntCount2 = (await client.query(`SELECT COUNT(*) FROM maintenance`)).rows[0].count;
  console.log(`  ✅ maintenance: ${mntCount2} rows`);

  // ---- FINAL COUNTS ----
  console.log('\n═══════════════════════════════════════');
  console.log('📊 FINAL COUNTS:');
  console.log('═══════════════════════════════════════');
  const all = ['clients','customers','drivers','trucks','trailers','trips','orders','invoices','expenses','payments','maintenance','payrolls','trip_costs','shipments','stops','order_stops','settlements','notifications','leads','driver_documents','truck_documents','client_locations','client_rates','cargo_items','invoice_items'];
  for (const t of all) {
    const r = await client.query(`SELECT COUNT(*) FROM "${t}"`);
    const n = parseInt(r.rows[0].count);
    console.log(`  ${n>=20?'✅':'❌'} ${t.padEnd(25)} ${n} rows`);
  }

  await client.end();
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
