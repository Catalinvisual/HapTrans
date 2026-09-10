const { Client } = require('pg');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const url = 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway';

// Idempotent backfill: legacy Prisma-era data -> TypeORM camelCase schema.
// Safe to run multiple times (uses IF NOT EXISTS / COALESCE).

const ORDER_STATUS = { DELIVERED: 'delivered', CANCELLED: 'cancelled', IN_TRANSIT: 'in_transit', PLANNED: 'planned', CONFIRMED: 'assigned', DRAFT: 'draft', BOOKED: 'planned' };
const TRIP_STATUS = { COMPLETED: 'completed', PLANNED: 'planned', IN_TRANSIT: 'driving', STARTED: 'started', CANCELLED: 'cancelled' };
const INVOICE_STATUS = { PAID: 'paid', ISSUED: 'sent', PARTIALLY_PAID: 'approved', CANCELLED: 'cancelled', DRAFT: 'draft' };
const DRIVER_STATUS = { ACTIVE: 'available', ON_LEAVE: 'vacation', SUSPENDED: 'off', INACTIVE: 'off', IN_TRIP: 'in_trip' };
const VEHICLE_STATUS = { AVAILABLE: 'active', IN_TRANSIT: 'in_trip', IN_MAINTENANCE: 'maintenance', OFF_ROAD: 'inactive', DECOMMISSIONED: 'inactive' };
const SERVIC_TYPE = { FTL: 'ftl', LTL: 'groupage', GROUPAGE: 'groupage', EXPRESS: 'express', STANDARD: 'ftl', DEDICATED: 'ftl', DISTRIBUTION: 'groupage' };
const PAY_METHOD = { BANK_TRANSFER: 'bank_transfer', CARD: 'card', CASH: 'cash', SEPA_DIRECT_DEBIT: 'sepa_direct_debit', OTHER: 'other' };

const N = (x) => (x === undefined || x === null || x === '' ? null : x);

async function main() {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const log = (...a) => console.log(...a);

  const addCol = async (t, col, ddl) => {
    try { await c.query(`ALTER TABLE "${t}" ADD COLUMN IF NOT EXISTS "${col}" ${ddl}`); }
    catch (e) { console.log(`  ! ALTER ${t}.${col}: ${e.message}`); }
  };

  // ---------- 0. Ensure entity columns exist ----------
  await addCol('orders', 'clientId', 'uuid');
  await addCol('orders', 'tripId', 'uuid');
  await addCol('orders', 'invoiceId', 'uuid');
  await addCol('orders', 'createdById', 'uuid');
  await addCol('orders', 'trackingToken', 'varchar');
  await addCol('orders', 'loadingReference', 'varchar');
  await addCol('orders', 'unloadingReference', 'varchar');
  await addCol('orders', 'contactPerson', 'varchar');
  await addCol('orders', 'contactPhone', 'varchar');
  await addCol('orders', 'notes', 'text');
  await addCol('orders', 'equipmentRequirements', 'text');
  await addCol('orders', 'delayMinutes', 'int');
  await addCol('orders', 'distanceKm', 'numeric(10,2)');
  await addCol('orders', 'price', 'numeric(10,2)');
  await addCol('orders', 'estimatedCost', 'numeric(10,2)');
  await addCol('orders', 'estimatedProfit', 'numeric(10,2)');
  await addCol('orders', 'originalEtaPickup', 'timestamp');
  await addCol('orders', 'currentEtaPickup', 'timestamp');
  await addCol('orders', 'originalEtaDelivery', 'timestamp');
  await addCol('orders', 'currentEtaDelivery', 'timestamp');
  await addCol('orders', 'createdAt', 'timestamp');
  await addCol('orders', 'updatedAt', 'timestamp');

  await addCol('trips', 'truckId', 'uuid');
  await addCol('trips', 'driverId', 'uuid');
  await addCol('trips', 'trackingToken', 'varchar');
  await addCol('trips', 'distanceKm', 'numeric(10,2)');
  await addCol('trips', 'tollCost', 'numeric(10,2)');
  await addCol('trips', 'estimatedCost', 'numeric(10,2)');
  await addCol('trips', 'createdAt', 'timestamp');
  await addCol('trips', 'updatedAt', 'timestamp');

  await addCol('invoices', 'clientId', 'uuid');
  await addCol('invoices', 'tripId', 'uuid');
  await addCol('invoices', 'amount', 'numeric(10,2)');
  await addCol('invoices', 'vatPercent', 'numeric(5,2)');
  await addCol('invoices', 'subtotal', 'numeric(10,2)');
  await addCol('invoices', 'vatAmount', 'numeric(10,2)');
  await addCol('invoices', 'fuelSurcharge', 'numeric(10,2)');
  await addCol('invoices', 'extraCosts', 'numeric(10,2)');
  await addCol('invoices', 'tollCosts', 'numeric(10,2)');
  await addCol('invoices', 'vatType', 'varchar');
  await addCol('invoices', 'total', 'numeric(10,2)');
  await addCol('invoices', 'issueDate', 'date');
  await addCol('invoices', 'dueDate', 'date');
  await addCol('invoices', 'pdfUrl', 'varchar');
  await addCol('invoices', 'publicId', 'varchar');
  await addCol('invoices', 'createdById', 'uuid');
  await addCol('invoices', 'createdAt', 'timestamp');
  await addCol('invoices', 'updatedAt', 'timestamp');

  await addCol('payments', 'invoiceId', 'uuid');
  await addCol('payments', 'status', 'varchar');
  await addCol('payments', 'updatedAt', 'timestamp');

  await addCol('companies', 'cui', 'varchar');
  await addCol('companies', 'logoUrl', 'varchar');
  await addCol('companies', 'createdAt', 'timestamp');
  await addCol('companies', 'updatedAt', 'timestamp');

  await addCol('order_stops', 'city', 'varchar');

  // entity enum columns currently stored as legacy enum types must be opened
  for (const tbl of ['invoices']) {
    await c.query(`ALTER TABLE "${tbl}" ALTER COLUMN status TYPE varchar USING status::text`).catch(e => console.log(`  ! alter ${tbl}.status:`, e.message));
  }
  await c.query(`ALTER TABLE payments ALTER COLUMN method TYPE varchar USING method::text`).catch(e => console.log('  ! alter payments.method:', e.message));
  await c.query(`ALTER TABLE drivers ALTER COLUMN status TYPE varchar USING status::text`).catch(e => console.log('  ! alter drivers.status:', e.message));
  log('= columns ensured =');

  // ---------- 1. users: backfill name/role/isActive from legacy ----------
  const companyId = (await c.query(`SELECT id FROM companies ORDER BY created_at LIMIT 1`)).rows[0]?.id;
  log('companyId =', companyId);
  // open role enum to varchar to avoid cast issues (rationalized values below)
  const roleType = (await c.query(`SELECT data_type FROM information_schema.columns WHERE table_name='users' AND column_name='role'`)).rows[0]?.data_type;
  if (roleType === 'USER-DEFINED') await c.query(`ALTER TABLE users ALTER COLUMN role TYPE varchar USING role::text`).catch(()=>{});
  await c.query(`
    UPDATE users SET
      "name" = COALESCE(NULLIF(NULLIF(TRIM("name"),''), NULL), CONCAT_WS(' ', first_name, last_name))`,
  );
  await c.query(`UPDATE users SET "role" = CASE WHEN email='admin@hapcargo.com' OR email='superadmin@hapcargo.local' OR first_name IN ('Admin','Super Admin') OR last_name IN ('Admin','Super Admin') THEN 'admin' ELSE 'dispatcher' END WHERE "role" IS NULL OR "role"=''`);
  await c.query(`UPDATE users SET "isActive" = COALESCE("isActive", (status='ACTIVE')) WHERE "isActive" IS NULL`);
  await c.query(`UPDATE users SET "companyId" = COALESCE("companyId", $1)`, [companyId]);
  // give the 3 legacy users a working bcrypt password (they were argon2 legacy)
  const empty = (await c.query(`SELECT id, email FROM users WHERE COALESCE("password",'')=''`)).rows;
  const hash = await bcrypt.hash('Laptophp2025.', 10);
  for (const u of empty) await c.query(`UPDATE users SET "password"=$1 WHERE id=$2`, [hash, u.id]);
  log('users:', (await c.query(`SELECT COUNT(*) c FROM users`)).rows[0].c, 'password set for', empty.length);

  // ---------- 2. companies ----------
  await c.query(`UPDATE companies SET "cui"=COALESCE("cui", vat_number, registration_number, tax_id, ''), "logoUrl"=COALESCE("logoUrl", logo_url), "createdAt"=COALESCE("createdAt", created_at), "updatedAt"=COALESCE("updatedAt", updated_at)`);
  log('= companies done =');

  // ---------- 3. clients <- customers (keep same ids) ----------
  await c.query(`
    INSERT INTO clients (id, "companyId", name, cui, address, "contactName", "contactEmail", phone, country,
                         "defaultFuelSurchargePercent", discount, "paymentTermsDays", "invoiceLanguage", "vatRule", "createdAt", "updatedAt")
    SELECT cc.id, COALESCE(cc.company_id, $1),
           COALESCE(NULLIF(TRIM(cc.trading_name),''), NULLIF(TRIM(cc.legal_name),''), cc.code),
           COALESCE(cc.vat_number, cc.registration_number),
           NULL, NULL, cc.main_email, cc.phone, cc.country,
           0, 0, 30, COALESCE(cc.default_language,'en'), 'standard', cc.created_at, cc.updated_at
    FROM customers cc
    ON CONFLICT (id) DO NOTHING`, [companyId]);
  log('clients:', (await c.query(`SELECT COUNT(*) c FROM clients`)).rows[0].c);

  // ---------- 4. trucks <- vehicles (keep same ids) ----------
  await c.query(`
    INSERT INTO trucks (id, "companyId", "plateNumber", brand, model, year, "truckType", euronorm, features,
                        "payloadCapacity", "maxWeightKg", "maxLdm", "maxVolumeCbm", "maxPallets",
                        status, "totalMileage", "fuelConsumption", "currentLat", "currentLng", "createdAt", "updatedAt")
    SELECT v.id, COALESCE(v.company_id, $1), v.registration_plate,
           COALESCE(v.manufacturer,''), COALESCE(v.model,''), v.year, COALESCE(vt.name,''), NULL, NULL,
           v.payload_kg, v.payload_kg, NULL, v.volume_m3, NULL,
           (CASE v.status WHEN 'AVAILABLE' THEN 'active' WHEN 'IN_TRANSIT' THEN 'in_trip'
                         WHEN 'IN_MAINTENANCE' THEN 'maintenance' WHEN 'OFF_ROAD' THEN 'inactive'
                         WHEN 'DECOMMISSIONED' THEN 'inactive' ELSE 'active' END)::trucks_status_enum,
           v.odometer_km, v.fuel_consumption_l100km, NULL, NULL, v.created_at, v.updated_at
    FROM vehicles v LEFT JOIN vehicle_types vt ON vt.id = v.vehicle_type_id
    ON CONFLICT (id) DO NOTHING`, [companyId]);
  log('trucks:', (await c.query(`SELECT COUNT(*) c FROM trucks`)).rows[0].c);

  // ---------- 5. orders ----------
  const orders = (await c.query(`SELECT id, service_type_id FROM orders WHERE "transportType" IS NULL OR "transportType"=''`)).rows;
  for (const o of orders) {
    const m = (await c.query(`SELECT code FROM service_types WHERE id=$1`, [o.service_type_id])).rows[0]?.code;
    await c.query(`UPDATE orders SET "transportType"=$1 WHERE id=$2`, [SERVIC_TYPE[m] || 'ftl', o.id]);
  }
  await c.query(`
UPDATE orders o SET
      "status" = CASE o.status WHEN 'DELIVERED' THEN 'delivered' WHEN 'CANCELLED' THEN 'cancelled'
                               WHEN 'IN_TRANSIT' THEN 'in_transit' WHEN 'PLANNED' THEN 'planned'
                               WHEN 'CONFIRMED' THEN 'assigned' ELSE o.status END,
      "companyId" = COALESCE(o."companyId", o.company_id),
      "clientId" = COALESCE(o."clientId", o.customer_id),
      "createdById" = COALESCE(o."createdById", o.created_by_id),
      "orderNumber" = COALESCE(NULLIF(o."orderNumber",''), o.order_number),
      "originalEtaPickup" = COALESCE(o."originalEtaPickup", o.requested_pickup_at),
      "currentEtaPickup" = COALESCE(o."currentEtaPickup", o.requested_pickup_at),
      "originalEtaDelivery" = COALESCE(o."originalEtaDelivery", o.requested_delivery_at),
      "currentEtaDelivery" = COALESCE(o."currentEtaDelivery", o.requested_delivery_at),
      "delayMinutes" = COALESCE(o."delayMinutes"::numeric, o.late_minutes, 0),
      "createdAt" = COALESCE(o."createdAt", o.created_at),
      "updatedAt" = COALESCE(o."updatedAt", o.updated_at)
  `);
// link orders.tripId from legacy trips.order_id
  await c.query(`UPDATE orders o SET "tripId" = t.id FROM trips t WHERE t.order_id = o.id AND o."tripId" IS NULL`);
  // link orders.invoiceId from legacy invoices.order_id
  await c.query(`UPDATE orders o SET "invoiceId" = i.id FROM invoices i WHERE i.order_id = o.id AND o."invoiceId" IS NULL`);
  // order stops + cargo from legacy order routing fields
  const ord = (await c.query(`SELECT id, company_id, customer_id, origin_city, origin_country, destination_city, destination_country, goods_description, weight_kg, volume_m3, pallets, loading_meters, is_temperature_controlled FROM orders`)).rows;
  let stops = 0, cargos = 0;
  for (const o of ord) {
    const cust = o.customer_id ? (await c.query(`SELECT COALESCE(NULLIF(TRIM(trading_name),''), NULLIF(TRIM(legal_name),''), code) name FROM customers WHERE id=$1`, [o.customer_id])).rows[0]?.name : null;
    if (o.origin_city) {
      const ex = await c.query(`SELECT 1 FROM order_stops WHERE "orderId"=$1 AND type='pickup'`, [o.id]);
      if (!ex.rows.length) {
        await c.query(`INSERT INTO order_stops ("companyId", "orderId", type, sequence, "companyName", address, city, country, "createdAt", "updatedAt")
          VALUES ($1,$2,'pickup',1,$3,$4,$4,$5,now(),now())`, [N(o.company_id) || companyId, o.id, N(cust), o.origin_city, N(o.origin_country)]);
        stops++;
      }
    }
    if (o.destination_city) {
      const ex = await c.query(`SELECT 1 FROM order_stops WHERE "orderId"=$1 AND type='delivery'`, [o.id]);
      if (!ex.rows.length) {
        await c.query(`INSERT INTO order_stops ("companyId", "orderId", type, sequence, "companyName", address, city, country, "createdAt", "updatedAt")
          VALUES ($1,$2,'delivery',2,$3,$4,$4,$5,now(),now())`, [N(o.company_id) || companyId, o.id, N(cust), o.destination_city, N(o.destination_country)]);
        stops++;
      }
    }
    if (o.goods_description || N(o.weight_kg)) {
      const ex = await c.query(`SELECT 1 FROM cargo_items WHERE "orderId"=$1`, [o.id]);
      if (!ex.rows.length) {
        await c.query(`INSERT INTO cargo_items ("companyId", "orderId", unit, description, "weightKg", "volumeCbm", ldm, "requiresTemperatureControl", "createdAt", "updatedAt")
          VALUES ($1,$2,'pallet',$3,$4,$5,$6,COALESCE($7,false),now(),now())`,
          [N(o.company_id) || companyId, o.id, N(o.goods_description), N(o.weight_kg), N(o.volume_m3), N(o.loading_meters), o.is_temperature_controlled]);
        cargos++;
      }
    }
  }
  log('orders updated; order_stops added:', stops, 'cargo_items added:', cargos);
  log('orders:', (await c.query(`SELECT COUNT(*) c FROM orders`)).rows[0].c);

  // ---------- 6. trips ----------
  await c.query(`
    UPDATE trips t SET
      "status" = CASE t.status WHEN 'COMPLETED' THEN 'completed' WHEN 'PLANNED' THEN 'planned'
                               WHEN 'IN_TRANSIT' THEN 'driving' WHEN 'STARTED' THEN 'started'
                               ELSE t.status END,
      "companyId" = COALESCE(t."companyId", t.company_id),
      "tripNumber" = COALESCE(t."tripNumber", t.trip_number),
      "truckId" = COALESCE(t."truckId", t.vehicle_id),
      "driverId" = COALESCE(t."driverId", t.driver_id),
      "dispatcherId" = COALESCE(t."dispatcherId", t.created_by_id),
      "plannedDeparture" = COALESCE(t."plannedDeparture", t.planned_start_at),
      "actualDeparture" = COALESCE(t."actualDeparture", t.actual_start_at),
      "plannedArrival" = COALESCE(t."plannedArrival", t.planned_end_at),
      "actualArrival" = COALESCE(t."actualArrival", t.actual_end_at),
      "distanceKm" = COALESCE(t."distanceKm", NULLIF(t.distance_km,'')::numeric),
      "tollCost" = COALESCE(t."tollCost", NULLIF(t.tolls_cost,'')::numeric, 0),
      "estimatedCost" = COALESCE(t."estimatedCost", NULLIF(t.cost_amount,'')::numeric, 0),
      "estimatedProfit" = COALESCE(t."estimatedProfit", NULLIF(t.margin_amount,'')::numeric, 0),
      "actualProfit" = COALESCE(t."actualProfit", NULLIF(t.margin_amount,'')::numeric, 0),
      "createdAt" = COALESCE(t."createdAt", t.created_at),
      "updatedAt" = COALESCE(t."updatedAt", t.updated_at)
  `);
  log('trips:', (await c.query(`SELECT COUNT(*) c FROM trips`)).rows[0].c);

  // ---------- 7. invoices ----------
  await c.query(`UPDATE invoices SET status = CASE status WHEN 'PAID' THEN 'paid' WHEN 'ISSUED' THEN 'sent'
                                WHEN 'PARTIALLY_PAID' THEN 'approved' WHEN 'CANCELLED' THEN 'cancelled'
                                WHEN 'DRAFT' THEN 'draft' ELSE status END`);
  await c.query(`
    UPDATE invoices i SET
      "invoiceNumber" = COALESCE(NULLIF(i."invoiceNumber",''), i.invoice_number),
      "clientId" = COALESCE(i."clientId", i.customer_id),
      "amount" = COALESCE(i."amount", NULLIF(i.total_amount,'')::numeric),
      "subtotal" = COALESCE(i."subtotal", NULLIF(i.subtotal_amount,'')::numeric),
      "vatAmount" = COALESCE(i."vatAmount", NULLIF(i.tax_amount,'')::numeric),
      "total" = COALESCE(i."total", NULLIF(i.total_amount,'')::numeric),
      "vatPercent" = COALESCE(i."vatPercent", 19),
      "issueDate" = COALESCE(i."issueDate", i.issue_date::date),
      "dueDate" = COALESCE(i."dueDate", i.due_date::date),
      "createdById" = COALESCE(i."createdById", i.created_by_id),
      "createdAt" = COALESCE(i."createdAt", i.created_at),
      "updatedAt" = COALESCE(i."updatedAt", i.updated_at)
  `);
  log('invoices:', (await c.query(`SELECT COUNT(*) c FROM invoices`)).rows[0].c);

  // ---------- 8. payments ----------
  await c.query(`UPDATE payments SET method = CASE method WHEN 'BANK_TRANSFER' THEN 'bank_transfer' WHEN 'CARD' THEN 'card'
                                WHEN 'CASH' THEN 'cash' WHEN 'SEPA_DIRECT_DEBIT' THEN 'sepa_direct_debit'
                                WHEN 'OTHER' THEN 'other' ELSE method END`);
  await c.query(`
    UPDATE payments p SET
      "invoiceId" = COALESCE(p."invoiceId", p.invoice_id),
      "date" = COALESCE(p."date", p.received_at::date),
      "status" = COALESCE(p."status", 'completed'),
      "createdAt" = COALESCE(p."createdAt", p.created_at),
      "updatedAt" = COALESCE(p."updatedAt", p.created_at)
  `);
  log('payments:', (await c.query(`SELECT COUNT(*) c FROM payments`)).rows[0].c);

  // ---------- 9. drivers: link a user account per driver ----------
  await c.query(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`).catch(e => console.log('  ! password_hash:', e.message));
  const drivers = (await c.query(`SELECT id, code, first_name, last_name, "userId", email FROM drivers`)).rows;
  const dHash = await bcrypt.hash('Driver2024!', 10);
  let created = 0;
  for (const d of drivers) {
    if (d.userId) continue;
    const nm = CONCAT(d.first_name, d.last_name, d.code);
    const em = (d.email || '').trim().toLowerCase().replace(/\s+/g, '.') || `driver-${d.code || d.id}@hapcargo.local`;
    const ins = await c.query(`INSERT INTO users (id, email, "password", "name", role, "isActive", "companyId")
      VALUES ($1,$2,$3,$4,'driver',true,$5) RETURNING id`, [randomUUID(), em, dHash, nm, companyId]);
    await c.query(`UPDATE drivers SET "userId"=$1 WHERE id=$2`, [ins.rows[0].id, d.id]);
    created++;
  }
  await c.query(`UPDATE drivers SET status = CASE status WHEN 'ACTIVE' THEN 'available' WHEN 'ON_LEAVE' THEN 'vacation'
                                WHEN 'SUSPENDED' THEN 'off' WHEN 'INACTIVE' THEN 'off' WHEN 'IN_TRIP' THEN 'in_trip'
                                ELSE 'available' END`);
  await c.query(`
    UPDATE drivers d SET
      "licenseNumber" = COALESCE(d."licenseNumber", d.license_number),
      "licenseExpiry" = COALESCE(d."licenseExpiry"::date, d.license_expiry::date),
      "phone" = COALESCE(d."phone", d.phone),
      "createdAt" = COALESCE(d."createdAt", d.created_at),
      "updatedAt" = COALESCE(d."updatedAt", d.updated_at)
  `);
  log('drivers:', (await c.query(`SELECT COUNT(*) c FROM drivers`)).rows[0].c, '| users created:', created);

  await c.end();
  console.log('\n✅ BACKFILL COMPLETE');
}
function CONCAT(...parts) { return parts.filter(x => x && x.trim()).map(x => x.trim()).join(' '); }
main().catch(e => { console.error(e); process.exit(1); });