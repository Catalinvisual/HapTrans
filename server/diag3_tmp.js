const { Client } = require('pg');
const url = 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway';

async function main() {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const check = async (t, cols) => {
    const r = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`, [t]);
    const have = new Set(r.rows.map(x => x.column_name));
    const missing = cols.filter(x => !have.has(x));
    console.log(`${t}: MISSING -> ${missing.join(', ') || 'none'}`);
  };
  await check('orders', ['clientId','tripId','invoiceId','createdById','price','estimatedCost','estimatedProfit','distanceKm','trackingToken','contactPerson','contactPhone','currency','equipmentRequirements','loadingReference','unloadingReference','notes','delayMinutes','originalEtaPickup','currentEtaPickup','originalEtaDelivery','currentEtaDelivery']);
  await check('trips', ['truckId','driverId','trackingToken','distanceKm','tollCost','estimatedCost','estimatedProfit','actualProfit','dispatcherId','dispatchedById','confirmedById','lockedById']);
  await check('invoices', ['clientId','tripId','amount','vatPercent','subtotal','vatAmount','fuelSurcharge','extraCosts','tollCosts','vatType','total','issueDate','dueDate','status','pdfUrl','publicId','createdById']);
  await check('payments', ['invoiceId','status','method','reference','amount','date','createdAt','updatedAt']);
  await check('users', ['companyId','password','name','role','createdAt','updatedAt','isActive']);
  await check('drivers', ['userId','phone','licenseNumber','licenseExpiry','medicalExpiry','tachoCardExpiry','payMode','payRate','status','createdAt','updatedAt','lastSeen']);
  await check('clients', ['companyId','name','cui','address','contactName','contactEmail','phone','country','paymentTermsDays','invoiceLanguage','vatRule','createdAt','updatedAt']);
  await check('trucks', ['companyId','plateNumber','brand','model','year','truckType','euronorm','features','payloadCapacity','maxWeightKg','maxLdm','maxVolumeCbm','maxPallets','status','totalMileage','fuelConsumption','createdAt','updatedAt','driverId','trailerId']);
  await check('companies', ['name','cui','address','timezone','logoUrl','createdAt','updatedAt']);

  const enums = await c.query(`SELECT t.typname, e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid WHERE t.typname IN ('trucks_status_enum','trucks_loadingaccess_enum','trucks_loadingrule_enum','drivers_status_enum','clients_????????') ORDER BY t.typname, e.enumsortorder`);
  console.log('ENUMS:'); for (const r of enums.rows) console.log(' ', r.typname, '=', r.enumlabel);

  const methodEnum = await c.query(`SELECT t.typname, e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid WHERE t.typname LIKE '%payments%' OR t.typname LIKE '%invoices%' ORDER BY t.typname`);
  console.log('PAY/INV ENUMS:'); for (const r of methodEnum.rows) console.log(' ', r.typname, '=', r.enumlabel);

  await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });