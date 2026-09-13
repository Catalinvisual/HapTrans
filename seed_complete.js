/**
 * SEED COMPLET HAP TMS - Toate coloanele, toate relațiile, date realiste
 * - Șterge toate datele (păstrând admin-ii)
 * - Populează fiecare tabel cu 20+ rânduri cu TOATE câmpurile completate
 * - Rute spre/dinspre Olanda, 33 paleți și mai puțini, zile diferite
 * - Conexiuni corecte între tabele (FK-uri)
 */
const { Client } = require('pg');
const crypto = require('crypto');

const DB_URL = 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway';
const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════
const R = (arr) => arr[Math.floor(Math.random() * arr.length)];
const RI = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const RF = (a, b, d = 2) => parseFloat((Math.random() * (b - a) + a).toFixed(d));
const RD = (s, e) => { const a = new Date(s).getTime(), b = new Date(e).getTime(); return new Date(a + Math.random() * (b - a)); };
const UUID = () => crypto.randomUUID();
const TOKEN = () => crypto.randomBytes(16).toString('hex');

// ═══════════════════════════════════════════════
// DATE REALISTE
// ═══════════════════════════════════════════════
const PRENUME = ['Alexandru','Andrei','Bogdan','Catalin','Cosmin','Daniel','Emil','Florin','Gabriel','Gheorghe','Ion','Ionut','Liviu','Lucian','Marius','Mihai','Mircea','Nicolae','Petru','Radu','Razvan','Sebastian','Sorin','Stefan','Teodor','Vasile','Victor','Vlad','Adrian','Alin','Claudiu','Cristian','Dumitru'];
const NUME = ['Popescu','Ionescu','Popa','Stan','Stoica','Gheorghe','Moldovan','Munteanu','Constantin','Dima','Florea','Dumitrescu','Badea','Niculescu','Serban','Preda','Nica','Draghici','Grigore','Matei','Rusu','Luca','Crisan','Dobre','Muresan','Ungureanu','Oprea','Petrescu','Sandu','Costache'];
const FIRME_RO = ['Trans-Logistic SRL','EuroFreight România SA','CargoSpeed Trans SRL','LogiRom International SRL','FastTrans Europe SRL','RomCargo SA','Baltic Express SRL','Dunărea Trans SRL','ExpressCargo România SRL','PolyTrans Logistic SRL','AgriTrans România SRL','TerraLog SRL','FlexiCargo SA','OmniFret România SRL','TransCarpat SRL','Delta Cargo SRL','PrimaTrans SA','AquaLogistics SRL','AlphaTrans România SRL','BetaFreight SRL','GammaLog SRL','SigmaTrans SRL'];

// Orase cu coordonate reale
const ORASE = {
  // România
  'București':    { country:'RO', lat:44.4268, lng:26.1025, tz:'Europe/Bucharest', postal:'010000' },
  'Cluj-Napoca':  { country:'RO', lat:46.7712, lng:23.6236, tz:'Europe/Bucharest', postal:'400000' },
  'Timișoara':    { country:'RO', lat:45.7489, lng:21.2087, tz:'Europe/Bucharest', postal:'300000' },
  'Brașov':       { country:'RO', lat:45.6427, lng:25.5887, tz:'Europe/Bucharest', postal:'500000' },
  'Constanța':    { country:'RO', lat:44.1598, lng:28.6348, tz:'Europe/Bucharest', postal:'900000' },
  'Iași':         { country:'RO', lat:47.1585, lng:27.6014, tz:'Europe/Bucharest', postal:'700000' },
  'Craiova':      { country:'RO', lat:44.3302, lng:23.7949, tz:'Europe/Bucharest', postal:'200000' },
  'Galați':       { country:'RO', lat:45.4353, lng:28.0080, tz:'Europe/Bucharest', postal:'800000' },
  'Ploiești':     { country:'RO', lat:44.9360, lng:26.0227, tz:'Europe/Bucharest', postal:'100000' },
  'Oradea':       { country:'RO', lat:47.0722, lng:21.9218, tz:'Europe/Bucharest', postal:'410000' },
  'Sibiu':        { country:'RO', lat:45.7983, lng:24.1256, tz:'Europe/Bucharest', postal:'550000' },
  'Bacău':        { country:'RO', lat:46.5677, lng:26.9135, tz:'Europe/Bucharest', postal:'600000' },
  // Germania
  'Hamburg':      { country:'DE', lat:53.5753, lng:10.0153, tz:'Europe/Berlin', postal:'20095' },
  'München':      { country:'DE', lat:48.1351, lng:11.5820, tz:'Europe/Berlin', postal:'80331' },
  'Berlin':       { country:'DE', lat:52.5200, lng:13.4050, tz:'Europe/Berlin', postal:'10115' },
  'Frankfurt':    { country:'DE', lat:50.1109, lng:8.6821, tz:'Europe/Berlin', postal:'60311' },
  'Düsseldorf':   { country:'DE', lat:51.2217, lng:6.7762, tz:'Europe/Berlin', postal:'40213' },
  // Olanda
  'Rotterdam':    { country:'NL', lat:51.9244, lng:4.4777, tz:'Europe/Amsterdam', postal:'3011' },
  'Amsterdam':    { country:'NL', lat:52.3676, lng:4.9041, tz:'Europe/Amsterdam', postal:'1011' },
  'Eindhoven':    { country:'NL', lat:51.4381, lng:5.4752, tz:'Europe/Amsterdam', postal:'5611' },
  'Utrecht':      { country:'NL', lat:52.0907, lng:5.1214, tz:'Europe/Amsterdam', postal:'3511' },
  // Austria
  'Wien':         { country:'AT', lat:48.2082, lng:16.3738, tz:'Europe/Vienna', postal:'1010' },
  'Graz':         { country:'AT', lat:47.0707, lng:15.4395, tz:'Europe/Vienna', postal:'8010' },
  // Cehia
  'Praha':        { country:'CZ', lat:50.0755, lng:14.4378, tz:'Europe/Prague', postal:'11000' },
  // Polonia
  'Varșovia':     { country:'PL', lat:52.2297, lng:21.0122, tz:'Europe/Warsaw', postal:'00-001' },
  'Gdańsk':       { country:'PL', lat:54.3520, lng:18.6466, tz:'Europe/Warsaw', postal:'80-001' },
  // Belgia
  'Bruxelles':    { country:'BE', lat:50.8503, lng:4.3517, tz:'Europe/Brussels', postal:'1000' },
  // Franța
  'Paris':        { country:'FR', lat:48.8566, lng:2.3522, tz:'Europe/Paris', postal:'75001' },
  'Lyon':         { country:'FR', lat:45.7640, lng:4.8357, tz:'Europe/Paris', postal:'69001' },
  // Ungaria
  'Budapest':     { country:'HU', lat:47.4979, lng:19.0402, tz:'Europe/Budapest', postal:'1011' },
  // Slovacia
  'Bratislava':   { country:'SK', lat:48.1486, lng:17.1077, tz:'Europe/Bratislava', postal:'81101' },
};

const CITY_NAMES = Object.keys(ORASE);
const RO_CITIES = CITY_NAMES.filter(c => ORASE[c].country === 'RO');
const EU_CITIES = CITY_NAMES.filter(c => ORASE[c].country !== 'RO');
const NL_CITIES = ['Rotterdam','Amsterdam','Eindhoven','Utrecht'];

const TRUCK_BRANDS = ['Volvo','Scania','Mercedes-Benz','DAF','MAN','Iveco','Renault'];
const TRUCK_MODELS = {
  'Volvo': ['FH16 750','FH 500','FM 450','FMX 460','FH 460'],
  'Scania': ['R500 A4x2NA','R450 A4x2NA','S500 A4x2NA','R410 LA4x2MNA'],
  'Mercedes-Benz': ['Actros 1845 LS','Actros 1848 LS','Arocs 2040 S','Actros 2548 L'],
  'DAF': ['XF 480 FT','XF 530 FT','CF 340 FA','XG 480 FT'],
  'MAN': ['TGX 26.500','TGX 18.460','TGS 26.440','TGX 18.480'],
  'Iveco': ['S-WAY 480 AS','STRALIS X-WAY 460','S-WAY AS 570'],
  'Renault': ['T520 High 4x2','T480 Low 4x2','T High 520'],
};
const TRAILER_MAKES = ['Schmitz Cargobull','Krone','Kögel','Wielton','Fliegl','Renders','Schwarzmüller','Lamberet'];
const TRAILER_MODELS = {
  'Schmitz Cargobull': ['SCS 24/L - 13.62 EB','S.KO 24/L','S.CF 24 Cool Liner','S.CA 18/L'],
  'Krone': ['SD Profi Liner','Cool Liner','Box Liner','Multi Liner'],
  'Kögel': ['S24 Classic','MAXX','CARGO','PURIS'],
  'Wielton': ['NS3 A','NW 3 S','NW 18 L','NS2 T'],
  'Fliegl': ['SDS 400','FTS 450','SPZ 4700','TTK 400'],
  'Renders': ['ROC 12.27 SL','ROC 12.27 EUROLINER','ECO MAXX'],
  'Schwarzmüller': ['J-Serie Mega','E2 Curtainsider','Lowloader'],
  'Lamberet': ['LR FRC','EUROLINER','SR2 Multi Temperature'],
};

const CARGO_TYPES = ['Mobilă design','Produse alimentare ambalate','Materiale de construcții','Piese auto OEM','Produse cosmetice','Textile și îmbrăcăminte','Echipamente electrice','Chimicale industriale','Hârtie și carton','Produse farmaceutice','Componente industriale','Produse din plastic','Materiale agricole','Echipamente IT','Produse metalice','Piese mașini agricole','Produse ceramice','Băuturi alcoolice','Ulei alimentar','Detergenți industriali'];
const STRADE_RO = ['Calea Floreasca','Bd. Unirii','Str. Industriilor','Calea Victoriei','Str. Câmpului','Bd. Decebal','Str. Logistică','Calea Rahovei','Str. Traian','Bd. Nicolae Titulescu','Str. Progresului','Calea Dorobanților','Bd. Republicii','Str. Comercianților'];
const SERVICE_PROVIDERS = ['DAF Service București','Volvo Trucks România','Scania Service Cluj','Mercedes-Benz Trucks RO','MAN Truck & Bus România','AutoPro TIR Service','TruckFix Center','Euro Truck Service SRL','Trans Service Auto','Service TIR Ploiești','FleetCare România'];
const DESCRIERI_MENTENANTA = ['Schimb ulei motor și filtru ulei','Revizie completă 150.000 km','Înlocuire plăcuțe frână față și spate','Verificare și reglare sistem ABS','Schimb set 4 anvelope 315/70 R22.5','Reparație pompa injecție','Verificare și calibrare tahograf digital','Reparație complet sistem de frânare','Schimb curea distribuție și pompă apă','Diagnoza electronică completă','Înlocuire amortizoare față','Reparație cutie de viteze automată','Schimb filtru aer, combustibil, ulei','Verificare și reglare faruri','Reparație sistem climatizare cabină'];
const PAY_MODES = ['per_km','flat_salary','per_trip','mixed'];

function phoneRO() { return '+407' + RI(10,99) + RI(100000,999999); }
function phoneEU(country) {
  const prefix = { DE:'+4915', NL:'+3161', AT:'+4369', CZ:'+4260', PL:'+4860', BE:'+3247', FR:'+3361' };
  return (prefix[country] || '+4069') + RI(10000000,99999999);
}
function vatNr(country) {
  const codes = { RO:'RO',DE:'DE',NL:'NL',AT:'ATU',CZ:'CZ',PL:'PL',BE:'BE',FR:'FR' };
  return (codes[country]||'RO') + RI(10000000,99999999);
}
function regNr() { return 'J' + RI(10,40) + '/' + RI(100,9999) + '/' + RI(2010,2024); }
function ibanRO() { return 'RO' + RI(10,99) + 'RNCB0' + RI(100000000000000,999999999999999); }
function plateRO() {
  const judete = ['B','CJ','TM','BV','CT','IS','DJ','GL','PH','BH','SB','BC','AR','AG','MM','BN','CS','CV','DB','GR','HD','HR','IF','IL','MH','MS','NT','OT','SJ','SM','SV','TL','TR','VL','VN','VS'];
  const j = R(judete);
  const nr = RI(10,99);
  const l1 = String.fromCharCode(65+RI(0,25));
  const l2 = String.fromCharCode(65+RI(0,25));
  const l3 = String.fromCharCode(65+RI(0,25));
  return `${j}${nr}${l1}${l2}${l3}`;
}
function licenseNr() { return String.fromCharCode(65+RI(0,25))+String.fromCharCode(65+RI(0,25))+RI(100000,999999); }
function addDays(date, days) { return new Date(new Date(date).getTime() + days * 86400000); }
function formatDate(d) { return new Date(d).toISOString().split('T')[0]; }

// ═══════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════
async function main() {
  await client.connect();
  console.log('✅ Conectat la PostgreSQL Railway');

  // ─── GET COMPANY ───
  const compRes = await client.query('SELECT id FROM companies LIMIT 1');
  if (!compRes.rows.length) { console.log('❌ Nu există nicio companie!'); return; }
  const COMPANY_ID = compRes.rows[0].id;
  console.log('🏢 Company ID:', COMPANY_ID);

  // ─── ADMIN USERS PROTECTION ───
  const ADMIN_EMAILS = ['superadmin@hapcargo.local','admin@hapcargo.com','admin@hapcargo.ro','admin@hapcargo.local'];
  const ADMIN_IDS_RES = await client.query(`SELECT id FROM users WHERE email = ANY($1) AND id IS NOT NULL`, [ADMIN_EMAILS]);
  const ADMIN_IDS = ADMIN_IDS_RES.rows.map(r => r.id);
  console.log('🔒 Admin IDs protejați:', ADMIN_IDS.length);

  // ════════════════════════════════════════════════════════
  // STEP 1: ȘTERGERE TOTALĂ (protejând adminii)
  // ════════════════════════════════════════════════════════
  console.log('\n🧹 Ștergere date existente...');
  const DELETE_ORDER = [
    'tachograph_activity_events','tachograph_live_state','tachographs','telematics_devices',
    'vehicle_live_state','timeline_events','planning_actions','route_plan_stops','truck_route_plans',
    'stop_tasks','order_stops','stops','trip_costs','documents','driver_documents','truck_documents',
    'maintenance_attachments','maintenance','payrolls','settlements','payments',
    'invoice_items','invoices','expenses','cargo_items','shipments',
    'trips','orders','notifications','driver_hos','driver_tachograph_cards',
    'trailers','trucks','drivers',
    'customer_tag_assignments','customer_contacts','customer_locations',
    'client_rates','client_locations',
    'leads','customers','clients',
    'audit_logs','action_logs','report_history','saved_reports','scheduled_reports',
    'user_sessions','user_roles','company_users','document_shares',
  ];
  for (const tbl of DELETE_ORDER) {
    try { await client.query(`DELETE FROM "${tbl}"`); process.stdout.write('.'); }
    catch(e) { process.stdout.write('x'); }
  }
  // Șterge useri non-admin
  if (ADMIN_IDS.length > 0) {
    await client.query(`DELETE FROM users WHERE id != ALL($1) AND email != ALL($2)`, [ADMIN_IDS, ADMIN_EMAILS]);
  } else {
    await client.query(`DELETE FROM users WHERE email != ALL($1)`, [ADMIN_EMAILS]);
  }
  console.log('\n✅ Date șterse\n');

  // ════════════════════════════════════════════════════════
  // STEP 2: CLIENTS (20) - cu toate câmpurile
  // ════════════════════════════════════════════════════════
  console.log('📦 [1/20] CLIENTS...');
  const CLIENTS = [];
  for (let i = 0; i < 22; i++) {
    const id = UUID();
    const firmNr = i < FIRME_RO.length ? i : i % FIRME_RO.length;
    const name = FIRME_RO[firmNr] + (i >= FIRME_RO.length ? ' (' + (i - FIRME_RO.length + 2) + ')' : '');
    const slug = name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'').substring(0,30);
    const city = R(RO_CITIES);
    const cityData = ORASE[city];
    const prenume = PRENUME[i % PRENUME.length], numeFam = NUME[i % NUME.length];
    const vatR = 'RO' + RI(10000000,99999999);
    await client.query(`
      INSERT INTO clients (id, name, cui, address, "contactName", "contactEmail", phone, country, "defaultFuelSurchargePercent", discount, "paymentTermsDays", "invoiceLanguage", "vatRule", "createdAt", "updatedAt", "companyId")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
    `, [
      id, name, vatR,
      R(STRADE_RO) + ' nr.' + RI(1,200) + ', ' + city,
      prenume + ' ' + numeFam,
      prenume.toLowerCase() + '.' + numeFam.toLowerCase() + '@' + slug.substring(0,15) + '.ro',
      phoneRO(), cityData.country,
      RF(2,12,1), RF(0,8,1), R([15,30,45,60]),
      R(['ro','en','de']), R(['standard','reverse_charge','exempt']),
      new Date(), new Date(), COMPANY_ID
    ]);
    CLIENTS.push({ id, name, city, cityData, prenume, numeFam });
  }
  console.log(`  ✅ ${CLIENTS.length} clienți inserați`);

  // Client locations (pentru fiecare client - adrese de pickup/delivery)
  console.log('📦 [1b] CLIENT LOCATIONS...');
  const CLIENT_LOCATIONS = [];
  for (const cl of CLIENTS) {
    for (let j = 0; j < 2; j++) { // 2 locații per client
      const locId = UUID();
      const locCity = j === 0 ? cl.city : R(CITY_NAMES);
      const locData = ORASE[locCity];
      await client.query(`
        INSERT INTO client_locations (id, name, address, latitude, longitude, country, "contactPerson", phone, "timeZone", "createdAt", "updatedAt", "companyId", "clientId")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      `, [
        locId,
        cl.name + ' - ' + (j === 0 ? 'Sediu Principal' : 'Depozit ' + locCity),
        R(STRADE_RO) + ' nr.' + RI(1,200) + ', ' + locCity,
        locData.lat + RF(-0.05,0.05,4), locData.lng + RF(-0.05,0.05,4),
        locData.country, cl.prenume + ' ' + cl.numeFam,
        phoneRO(), locData.tz, new Date(), new Date(), COMPANY_ID, cl.id
      ]);
      CLIENT_LOCATIONS.push({ id: locId, clientId: cl.id, city: locCity, cityData: locData, name: cl.name + ' - ' + locCity });
    }
  }
  console.log(`  ✅ ${CLIENT_LOCATIONS.length} locații clienți`);

  // ════════════════════════════════════════════════════════
  // STEP 3: CUSTOMERS (20) - cu toate câmpurile snake_case
  // ════════════════════════════════════════════════════════
  console.log('📦 [2/20] CUSTOMERS...');
  const CUSTOMERS = [];
  const custCities = [...RO_CITIES, ...EU_CITIES.slice(0,10)];
  for (let i = 0; i < 20; i++) {
    const id = UUID();
    const firmName = FIRME_RO[(i + 7) % FIRME_RO.length] + ' Intl';
    const slug = firmName.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'').substring(0,20);
    const city = custCities[i % custCities.length];
    const cityData = ORASE[city] || ORASE['București'];
    await client.query(`
      INSERT INTO customers (id, company_id, code, legal_name, trading_name, short_name, registration_number, vat_number, tax_number, legal_form, country, default_language, default_currency, timezone, main_email, billing_email, phone, mobile, website, payment_terms, credit_limit, commercial_status, operational_instructions, special_handling_requirements, is_adr_relevant, is_temperature_controlled, status, is_active, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30)
    `, [
      id, COMPANY_ID,
      'CUST-' + String(i+1).padStart(3,'0'),
      firmName, firmName.replace(' Intl',''), firmName.substring(0,6).toUpperCase(),
      regNr(), vatNr(cityData.country), vatNr(cityData.country),
      R(['SRL','SA','SNC','RA']),
      cityData.country, R(['ro','en','de','fr']),
      R(['EUR','RON','USD']), cityData.tz,
      'info@' + slug + '.eu', 'facturi@' + slug + '.eu',
      phoneRO(), phoneRO(),
      'https://www.' + slug + '.eu',
      RI(15,60) + ' zile', RF(10000,200000,0),
      R(['prospect','active','vip','inactive']),
      'Notificare obligatorie cu 2h înainte. Acces TIR 24/7.',
      R(['Fragilă','Fără restricții speciale','Necesită pătură','Paletare europală']),
      Math.random() < 0.15, Math.random() < 0.2,
      'active', true, new Date(), new Date()
    ]);
    CUSTOMERS.push({ id, name: firmName, city, cityData });
  }
  console.log(`  ✅ ${CUSTOMERS.length} customers`);

  // ════════════════════════════════════════════════════════
  // STEP 4: DRIVERS (20) - cu TOATE câmpurile
  // ════════════════════════════════════════════════════════
  console.log('📦 [3/20] DRIVERS + USER ACCOUNTS...');
  const DRIVERS = [];
  const driverStatuses = ['available','in_trip','off','sick','vacation'];
  for (let i = 0; i < 20; i++) {
    const driverId = UUID();
    const userId = UUID();
    const prenume = PRENUME[i % PRENUME.length];
    const numeFam = NUME[i % NUME.length];
    const email = `sofer.${prenume.toLowerCase()}.${numeFam.toLowerCase()}${i+1}@hapcargo.ro`;
    const city = R(RO_CITIES);
    const cityData = ORASE[city];
    const status = driverStatuses[i % driverStatuses.length];
    const hiredAt = RD('2018-01-01','2023-12-31');
    const licExpiry = RD('2026-01-01','2030-12-31');
    const medExpiry = RD('2025-06-01','2028-12-31');
    const tachoExpiry = RD('2026-01-01','2030-06-01');
    const payMode = R(PAY_MODES);
    const payRate = payMode === 'per_km' ? RF(0.12,0.28,3).toString() : payMode === 'flat_salary' ? RI(4000,8000).toString() : payMode === 'per_trip' ? RI(200,600).toString() : RI(3000,6000).toString();

    // Insert user account for driver
    try {
      await client.query(`
        INSERT INTO users (id, email, first_name, last_name, password_hash, status, email_verified, role, "isActive", "companyId", "createdAt", "updatedAt", "grossSalary", "dailyRate", language)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      `, [
        userId, email, prenume, numeFam,
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaX7pF.xHhTLl.qZnJP3sxH2W',
        'active', true, 'driver', true, COMPANY_ID, new Date(), new Date(),
        RI(3500,7500).toString(), RI(80,150).toString(), 'ro'
      ]);
    } catch(e) { /* user poate exista deja */ }

    // Insert driver record cu TOATE câmpurile
    await client.query(`
      INSERT INTO drivers (id, company_id, code, first_name, last_name, phone, email, license_number, license_expiry, status, rating, total_trips, total_km, on_time_rate, hired_at, is_active, created_at, updated_at, "userId", "licenseNumber", "licenseExpiry", "medicalExpiry", "tachoCardExpiry", "payMode", "payRate", "currentLat", "currentLng", "lastSeen", "createdAt", "updatedAt")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30)
    `, [
      driverId, COMPANY_ID,
      'DRV-' + String(i+1).padStart(3,'0'),
      prenume, numeFam,
      phoneRO(), email,
      licenseNr(), licExpiry,
      status, RF(3.5,5.0,1).toString(),
      RI(50,500), RF(50000,500000,0).toString(),
      RF(80,99,1).toString() + '%',
      hiredAt, true, new Date(), new Date(),
      // camelCase columns
      userId,
      licenseNr(), formatDate(licExpiry),
      formatDate(medExpiry), formatDate(tachoExpiry),
      payMode, payRate,
      (cityData.lat + RF(-0.5,0.5,4)).toString(),
      (cityData.lng + RF(-0.5,0.5,4)).toString(),
      new Date().toISOString(),
      new Date(), new Date()
    ]);
    DRIVERS.push({ id: driverId, userId, prenume, numeFam, email, status, city, cityData, payMode, payRate });
  }
  console.log(`  ✅ ${DRIVERS.length} șoferi cu conturi user`);

  // Driver Documents - pentru fiecare șofer
  console.log('📦 [3b] DRIVER DOCUMENTS...');
  const driverDocTypes = ['license','passport','medical_cert','adr_cert','cpc_cert','id_card','tacho_card'];
  for (const drv of DRIVERS) {
    for (const docType of driverDocTypes.slice(0, RI(3,7))) {
      await client.query(`
        INSERT INTO driver_documents (id, type, "documentNumber", "expiryDate", "fileUrl", "createdAt", "driverId")
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `, [
        UUID(), docType, licenseNr(),
        new Date(RD('2025-01-01','2031-12-31')),
        null, new Date(), drv.id
      ]);
    }
  }
  console.log('  ✅ Documente șoferi inserate');

  // ════════════════════════════════════════════════════════
  // STEP 5: TRAILERS (20) - cu TOATE câmpurile
  // ════════════════════════════════════════════════════════
  console.log('📦 [4/20] TRAILERS...');
  const TRAILERS = [];
  const trailerTypes = ['mega','frigo','standard','walking_floor','container','flatbed','other'];
  const trailerStatuses = ['active','maintenance','inactive'];
  for (let i = 0; i < 22; i++) {
    const id = UUID();
    const make = R(TRAILER_MAKES);
    const modelList = TRAILER_MODELS[make] || ['Standard Curtainsider'];
    const model = R(modelList);
    const tType = trailerTypes[i % trailerTypes.length];
    const year = RI(2015,2024);
    const plateNr = plateRO();
    const maxPallets = R([33,33,33,26,20,14,10,18,24]);
    const maxLdm = maxPallets === 33 ? 13.6 : (maxPallets / 33 * 13.6).toFixed(1) * 1;
    const apkDate = new Date(RD('2025-03-01','2031-12-31'));

    await client.query(`
      INSERT INTO trailers (id, "companyId", "plateNumber", type, brand, year, "payloadCapacityWeight", "maxLdm", "maxVolumeCbm", "payloadCapacityPallets", status, "apkExpiry", "createdAt", "updatedAt")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    `, [
      id, COMPANY_ID, plateNr, tType, make, year,
      RF(21000,24000,0), maxLdm, RF(80,100,0), maxPallets,
      trailerStatuses[i % trailerStatuses.length],
      apkDate, new Date(), new Date()
    ]);
    TRAILERS.push({ id, make, model, plateNr, tType, year, maxPallets, maxLdm });
  }
  console.log(`  ✅ ${TRAILERS.length} remorci`);

  // ════════════════════════════════════════════════════════
  // STEP 6: TRUCKS (20) - cu TOATE câmpurile, legate de șoferi și remorci
  // ════════════════════════════════════════════════════════
  console.log('📦 [5/20] TRUCKS...');
  const TRUCKS = [];
  const truckStatuses = ['active','in_trip','maintenance','inactive'];
  const loadingAccess = ['rear_only','side_only','rear_and_side','full_access'];
  const loadingRules = ['lifo','fifo','flexible','manual'];
  for (let i = 0; i < 20; i++) {
    const id = UUID();
    const brand = R(TRUCK_BRANDS);
    const model = R(TRUCK_MODELS[brand]);
    const plateNr = plateRO();
    const year = RI(2018,2024);
    const driver = DRIVERS[i] || null;
    const trailer = TRAILERS[i] || null;
    const truckStatus = i < 15 ? 'active' : truckStatuses[i % truckStatuses.length];
    const city = R(RO_CITIES);
    const cityData = ORASE[city];
    const mileage = RF(80000,700000,0);
    const features = JSON.stringify(['GPS Tracking','Tail Lift','ADR Ready','Temperature Logger'].slice(0, RI(1,4)));

    await client.query(`
      INSERT INTO trucks (id, "companyId", "plateNumber", brand, model, year, "truckType", euronorm, features, "payloadCapacity", "maxWeightKg", "maxLdm", "maxVolumeCbm", "maxPallets", "loadingAccess", "loadingRule", "costPerKm", "fuelConsumption", status, "currentLat", "currentLng", "totalMileage", "nextMaintenanceMileage", "createdAt", "updatedAt", "driverId", "trailerId")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
    `, [
      id, COMPANY_ID, plateNr, brand, model, year,
      R(['mega','standard','frigo']),
      R(['EURO5','EURO6','EURO6c','EURO6d']),
      features,
      RF(21000,24000,0), RF(40000,44000,0),
      trailer ? trailer.maxLdm : 13.6,
      RF(80,100,0), trailer ? trailer.maxPallets : 33,
      R(loadingAccess), R(loadingRules),
      RF(1.15,2.45,3), RF(27,40,1),
      truckStatus,
      (cityData.lat + RF(-0.3,0.3,4)).toString(), (cityData.lng + RF(-0.3,0.3,4)).toString(),
      mileage, mileage + RF(20000,80000,0),
      new Date(), new Date(),
      driver ? driver.id : null,
      trailer ? trailer.id : null
    ]);
    TRUCKS.push({ id, brand, model, plateNr, year, truckStatus, driver, trailer });
  }
  console.log(`  ✅ ${TRUCKS.length} camioane`);

  // Truck Documents
  console.log('📦 [5b] TRUCK DOCUMENTS...');
  const truckDocTypes = ['registration','insurance_rca','insurance_casco','vignette_ro','vignette_de','vignette_at','vignette_cz','vignette_pl','vignette_be','vignette_hu','itp','cmr_insurance','adr_permit'];
  for (const truck of TRUCKS) {
    for (const docType of truckDocTypes.slice(0, RI(5,10))) {
      await client.query(`
        INSERT INTO truck_documents (id, type, "documentNumber", "expiryDate", "fileUrl", "createdAt", "truckId")
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `, [
        UUID(), docType, 'DOC-' + RI(100000,999999),
        new Date(RD('2025-01-01','2031-12-31')),
        null, new Date(), truck.id
      ]);
    }
  }
  console.log('  ✅ Documente camioane');

  // ════════════════════════════════════════════════════════
  // STEP 7: TRIPS (20+) - cu TOATE câmpurile, rute realiste incl. NL
  // ════════════════════════════════════════════════════════
  console.log('📦 [6/20] TRIPS...');
  const TRIPS = [];
  const tripStatuses = ['planned','in_progress','completed','completed','completed','cancelled'];

  // Rute predefinite - incluzând Olanda
  const ROUTES = [
    { from:'București', to:'Rotterdam' },
    { from:'Cluj-Napoca', to:'Amsterdam' },
    { from:'Timișoara', to:'Eindhoven' },
    { from:'Brașov', to:'Utrecht' },
    { from:'Rotterdam', to:'București' },
    { from:'Amsterdam', to:'Timișoara' },
    { from:'Eindhoven', to:'Cluj-Napoca' },
    { from:'București', to:'Hamburg' },
    { from:'București', to:'München' },
    { from:'Timișoara', to:'Wien' },
    { from:'Cluj-Napoca', to:'Praha' },
    { from:'București', to:'Varșovia' },
    { from:'Rotterdam', to:'Varșovia' },
    { from:'Amsterdam', to:'București' },
    { from:'Hamburg', to:'București' },
    { from:'București', to:'Bruxelles' },
    { from:'Constanța', to:'Rotterdam' },
    { from:'Iași', to:'Amsterdam' },
    { from:'Rotterdam', to:'Cluj-Napoca' },
    { from:'Amsterdam', to:'Brașov' },
    { from:'Utrecht', to:'București' },
    { from:'Eindhoven', to:'Timișoara' },
    { from:'Frankfurt', to:'București' },
    { from:'München', to:'Cluj-Napoca' },
    { from:'București', to:'Paris' },
  ];

  const distanceMap = {
    'București-Rotterdam': 2150, 'București-Amsterdam': 2280, 'București-Eindhoven': 2200,
    'București-Utrecht': 2250, 'București-Hamburg': 1800, 'București-München': 1550,
    'București-Frankfurt': 1700, 'București-Wien': 1050, 'București-Praha': 1350,
    'București-Varșovia': 1420, 'București-Bruxelles': 2100, 'București-Paris': 2300,
    'Cluj-Napoca-Rotterdam': 2000, 'Cluj-Napoca-Amsterdam': 2100, 'Timișoara-Wien': 720,
    'Timișoara-Eindhoven': 1950, 'Constanța-Rotterdam': 2400, 'Iași-Amsterdam': 2500,
  };

  for (let i = 0; i < 25; i++) {
    const id = UUID();
    const route = ROUTES[i % ROUTES.length];
    const fromCity = route.from;
    const toCity = route.to;
    const fromData = ORASE[fromCity];
    const toData = ORASE[toCity];
    const truck = TRUCKS[i % TRUCKS.length];
    const driver = truck.driver || DRIVERS[i % DRIVERS.length];
    const trailer = truck.trailer || TRAILERS[i % TRAILERS.length];
    const status = tripStatuses[i % tripStatuses.length];

    const distKey1 = fromCity + '-' + toCity;
    const distKey2 = toCity + '-' + fromCity;
    const estKm = distanceMap[distKey1] || distanceMap[distKey2] || RF(300,2500,0);

    // Date de plecare variabile
    const daysAgo = i < 10 ? RI(1,90) : -RI(1,60); // trecut sau viitor
    const plannedDep = addDays(new Date(), -daysAgo);
    const plannedArr = addDays(plannedDep, Math.ceil(estKm / 800)); // ~800km/zi
    const actualDep = status !== 'planned' ? new Date(plannedDep.getTime() + RI(-3600000,7200000)) : null;
    const actualArr = status === 'completed' ? new Date(plannedArr.getTime() + RI(-7200000,14400000)) : null;

    const revenue = RF(estKm * 1.2, estKm * 2.5, 2);
    const cost = RF(estKm * 0.7, estKm * 1.3, 2);
    const margin = revenue - cost;
    const fuelCost = RF(estKm * 0.28, estKm * 0.40, 2);
    const tollCost = estKm > 1000 ? RF(150,600,2) : RF(30,200,2);
    const driverCost = driver ? RF(250,600,2) : 0;

    await client.query(`
      INSERT INTO trips (
        id, company_id, trip_number, status,
        planned_start_at, planned_end_at, actual_start_at, actual_end_at,
        distance_km, actual_distance_km,
        revenue_amount, cost_amount, margin_amount, margin_rate,
        fuel_cost, tolls_cost, driver_cost, maintenance_cost, other_cost,
        currency, is_on_time, late_minutes, waiting_minutes,
        start_city, end_city, created_at, updated_at,
        "companyId", "tripNumber", "plannedDeparture", "actualDeparture",
        "plannedArrival", "actualArrival",
        "estimatedProfit", "actualProfit", "locked", "version",
        "trailerId", "trackingToken", "distanceKm", "tollCost", "estimatedCost",
        "truckId", "driverId", "createdAt", "updatedAt",
        "validationStatus", "trackingActivated"
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
        $20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,
        $37,$38,$39,$40,$41,$42,$43,$44,$45,$46,$47,$48
      )
    `, [
      id, COMPANY_ID, 'TRIP-' + String(i+1).padStart(4,'0'), status,
      plannedDep, plannedArr, actualDep, actualArr,
      estKm.toString(), status === 'completed' ? RF(estKm*0.97,estKm*1.03,0).toString() : null,
      revenue.toString(), cost.toString(), margin.toString(), (margin/revenue*100).toFixed(1),
      fuelCost.toString(), tollCost.toString(), driverCost.toString(),
      RF(0,200,2).toString(), RF(0,100,2).toString(),
      'EUR', Math.random() < 0.85, Math.random() < 0.15 ? RI(15,180) : 0,
      Math.random() < 0.5 ? RI(30,300) : 0,
      fromCity, toCity, new Date(), new Date(),
      // camelCase
      COMPANY_ID, 'TRIP-' + String(i+1).padStart(4,'0'),
      plannedDep, actualDep, plannedArr, actualArr,
      margin, status === 'completed' ? RF(margin*0.8,margin*1.2,2) : null,
      false, 1,
      trailer ? trailer.id : null,
      TOKEN().substring(0,16),
      estKm, tollCost, cost,
      truck.id, driver ? driver.id : null,
      new Date(), new Date(),
      'valid', true
    ]);
    TRIPS.push({ id, fromCity, toCity, fromData, toData, status, truck, driver, trailer, estKm, revenue, cost, plannedDep, plannedArr });
  }
  console.log(`  ✅ ${TRIPS.length} curse (incluzând rute Olanda)`);

  // ════════════════════════════════════════════════════════
  // STEP 8: ORDERS (25) - cu TOATE câmpurile + unassigned orders
  // ════════════════════════════════════════════════════════
  console.log('📦 [7/20] ORDERS...');
  const ORDERS = [];
  const orderStatuses = ['pending','confirmed','in_transit','delivered','invoiced','cancelled'];

  // Rute orders - incluzând multe spre/dinspre NL
  const ORDER_ROUTES = [
    { pickup:'București', delivery:'Rotterdam', pallets:33, kg:24000 },
    { pickup:'Cluj-Napoca', delivery:'Amsterdam', pallets:20, kg:15000 },
    { pickup:'Timișoara', delivery:'Eindhoven', pallets:33, kg:22000 },
    { pickup:'Rotterdam', delivery:'București', pallets:33, kg:23500 },
    { pickup:'Amsterdam', delivery:'Cluj-Napoca', pallets:14, kg:10000 },
    { pickup:'Brașov', delivery:'Utrecht', pallets:26, kg:18000 },
    { pickup:'Eindhoven', delivery:'Brașov', pallets:33, kg:24000 },
    { pickup:'București', delivery:'Hamburg', pallets:33, kg:21000 },
    { pickup:'Hamburg', delivery:'București', pallets:18, kg:12000 },
    { pickup:'Timișoara', delivery:'München', pallets:33, kg:22000 },
    { pickup:'München', delivery:'Timișoara', pallets:10, kg:7500 },
    { pickup:'București', delivery:'Wien', pallets:33, kg:24000 },
    { pickup:'Wien', delivery:'Constanța', pallets:24, kg:17000 },
    { pickup:'Cluj-Napoca', delivery:'Frankfurt', pallets:33, kg:23000 },
    { pickup:'Frankfurt', delivery:'Oradea', pallets:8, kg:5000 },
    { pickup:'Galați', delivery:'Rotterdam', pallets:33, kg:24000 },
    { pickup:'Rotterdam', delivery:'Galați', pallets:33, kg:22000 },
    { pickup:'Constanța', delivery:'Amsterdam', pallets:33, kg:24000 },
    { pickup:'Iași', delivery:'Eindhoven', pallets:20, kg:14000 },
    { pickup:'Utrecht', delivery:'Iași', pallets:33, kg:23000 },
    { pickup:'Sibiu', delivery:'Rotterdam', pallets:16, kg:11000 },
    { pickup:'București', delivery:'Bruxelles', pallets:33, kg:24000 },
    { pickup:'Craiova', delivery:'Amsterdam', pallets:33, kg:22000 },
    { pickup:'București', delivery:'Paris', pallets:24, kg:16000 },
    { pickup:'Paris', delivery:'București', pallets:33, kg:23000 },
    // Unassigned orders (fara trip)
    { pickup:'Ploiești', delivery:'Rotterdam', pallets:33, kg:24000, unassigned:true },
    { pickup:'Cluj-Napoca', delivery:'Amsterdam', pallets:22, kg:15000, unassigned:true },
    { pickup:'Timișoara', delivery:'Utrecht', pallets:33, kg:20000, unassigned:true },
    { pickup:'București', delivery:'Eindhoven', pallets:15, kg:10000, unassigned:true },
    { pickup:'Bacău', delivery:'Hamburg', pallets:33, kg:24000, unassigned:true },
  ];

  for (let i = 0; i < ORDER_ROUTES.length; i++) {
    const id = UUID();
    const route = ORDER_ROUTES[i];
    const client_rec = CLIENTS[i % CLIENTS.length];
    const customer_rec = CUSTOMERS[i % CUSTOMERS.length];
    const pickupData = ORASE[route.pickup] || ORASE['București'];
    const deliveryData = ORASE[route.delivery] || ORASE['Rotterdam'];
    const isUnassigned = route.unassigned === true;
    const trip = !isUnassigned ? TRIPS[i % TRIPS.length] : null;
    const status = isUnassigned ? R(['pending','confirmed']) : orderStatuses[i % orderStatuses.length];

    const pickupDate = addDays(new Date(), -(isUnassigned ? -RI(1,14) : RI(0,120)));
    const deliveryDate = addDays(pickupDate, Math.ceil((distanceMap[route.pickup+'-'+route.delivery] || 1500) / 800));

    const ldm = (route.pallets / 33 * 13.6).toFixed(2) * 1;
    const price = RF(600,3500,2);
    const cost = RF(price * 0.55, price * 0.75, 2);
    const profit = price - cost;
    const transportType = R(['FTL','FTL','LTL','Dedicated']);
    const cargo = R(CARGO_TYPES);
    const contactPrenume = PRENUME[i % PRENUME.length];
    const contactNume = NUME[i % NUME.length];
    const loadRef = 'LOAD-' + RI(10000,99999);
    const unloadRef = 'UNLOAD-' + RI(10000,99999);

    await client.query(`
      INSERT INTO orders (
        id, company_id, customer_id, order_number,
        origin_city, origin_country, destination_city, destination_country,
        goods_description, weight_kg, volume_m3, pallets, loading_meters,
        is_adr, is_temperature_controlled, status,
        requested_pickup_at, requested_delivery_at, promised_delivery_at,
        actual_pickup_at, actual_delivery_at, is_late, late_minutes,
        created_at, updated_at,
        "companyId", "orderNumber", "customerReference", "internalReference",
        "transportType", priority, currency, "clientId", "tripId",
        "trackingToken", "loadingReference", "unloadingReference",
        "contactPerson", "contactPhone", notes, "equipmentRequirements",
        "distanceKm", price, "estimatedCost", "estimatedProfit",
        "originalEtaPickup", "currentEtaPickup",
        "originalEtaDelivery", "currentEtaDelivery",
        "createdAt", "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
        $20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,
        $37,$38,$39,$40,$41,$42,$43,$44,$45,$46,$47,$48,$49,$50,$51
      )
    `, [
      id, COMPANY_ID, customer_rec.id,
      'ORD-' + String(2024000 + i + 1),
      route.pickup, pickupData.country,
      route.delivery, deliveryData.country,
      cargo, route.kg.toString(), RF(10,100,1).toString(),
      route.pallets, ldm.toString(),
      Math.random() < 0.08, Math.random() < 0.12,
      status, pickupDate, deliveryDate, deliveryDate,
      status === 'delivered' || status === 'invoiced' ? new Date(pickupDate) : null,
      status === 'delivered' || status === 'invoiced' ? new Date(deliveryDate) : null,
      Math.random() < 0.1, Math.random() < 0.1 ? RI(15,180) : 0,
      new Date(), new Date(),
      // camelCase
      COMPANY_ID, 'ORD-' + String(2024000+i+1),
      'CLI-REF-' + RI(10000,99999), 'INT-' + RI(10000,99999),
      transportType, R(['normal','urgent','low']), 'EUR',
      client_rec.id, trip ? trip.id : null,
      TOKEN().substring(0,16), loadRef, unloadRef,
      contactPrenume + ' ' + contactNume, phoneRO(),
      'Transport ' + cargo + ' din ' + route.pickup + ' în ' + route.delivery + '. ' + route.pallets + ' paleți.',
      R(['Camion mega','Standard furgon','Frigo obligatoriu','Fără restricții']),
      distanceMap[route.pickup+'-'+route.delivery] || RF(300,2500,0),
      price, cost, profit,
      pickupDate, pickupDate,
      deliveryDate, deliveryDate,
      new Date(), new Date()
    ]);
    ORDERS.push({ id, pickup: route.pickup, delivery: route.delivery, pallets: route.pallets, status, clientId: client_rec.id, customerId: customer_rec.id, tripId: trip?.id, price, pickupDate, deliveryDate, cargo });
  }
  console.log(`  ✅ ${ORDERS.length} comenzi (din care ${ORDERS.filter(o=>!o.tripId).length} unassigned)`);

  // ════════════════════════════════════════════════════════
  // STEP 9: ORDER STOPS - pickup și delivery pentru fiecare comandă
  // ════════════════════════════════════════════════════════
  console.log('📦 [8/20] ORDER STOPS...');
  for (let i = 0; i < ORDERS.length; i++) {
    const order = ORDERS[i];
    const client_rec = CLIENTS[i % CLIENTS.length];
    const pickupData = ORASE[order.pickup] || ORASE['București'];
    const deliveryData = ORASE[order.delivery] || ORASE['Rotterdam'];
    const clientLoc = CLIENT_LOCATIONS.find(l => l.clientId === client_rec.id) || CLIENT_LOCATIONS[i % CLIENT_LOCATIONS.length];

    // PICKUP STOP
    await client.query(`
      INSERT INTO order_stops (id, type, sequence, "companyName", address, latitude, longitude, country, city, "postalCode", "contactPerson", phone, "timeZone", "dateFrom", "dateTo", "timeFrom", "timeUntil", reference, notes, "createdAt", "updatedAt", "companyId", "orderId", "clientLocationId")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
    `, [
      UUID(), 'pickup', 1,
      client_rec.name,
      R(STRADE_RO) + ' nr.' + RI(1,200) + ', ' + order.pickup,
      pickupData.lat + RF(-0.05,0.05,4), pickupData.lng + RF(-0.05,0.05,4),
      pickupData.country, order.pickup, pickupData.postal,
      client_rec.prenume + ' ' + client_rec.numeFam, phoneRO(),
      pickupData.tz,
      new Date(order.pickupDate), new Date(order.pickupDate),
      R(['07:00','08:00','09:00','10:00']),
      R(['15:00','16:00','17:00','18:00']),
      'LOAD-' + RI(10000,99999),
      'Rampa disponibilă. Pregătiți CMR. ' + order.pallets + ' paleți, ' + ORASE[order.pickup]?.country,
      new Date(), new Date(), COMPANY_ID, order.id,
      clientLoc ? clientLoc.id : null
    ]);

    // DELIVERY STOP
    await client.query(`
      INSERT INTO order_stops (id, type, sequence, "companyName", address, latitude, longitude, country, city, "postalCode", "contactPerson", phone, "timeZone", "dateFrom", "dateTo", "timeFrom", "timeUntil", reference, notes, "createdAt", "updatedAt", "companyId", "orderId", "clientLocationId")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
    `, [
      UUID(), 'delivery', 2,
      FIRME_RO[(i + 5) % FIRME_RO.length],
      'Industriestraat ' + RI(1,200) + ', ' + order.delivery,
      deliveryData.lat + RF(-0.05,0.05,4), deliveryData.lng + RF(-0.05,0.05,4),
      deliveryData.country, order.delivery, deliveryData.postal,
      PRENUME[(i+5) % PRENUME.length] + ' ' + NUME[(i+5) % NUME.length],
      ORASE[order.delivery]?.country === 'NL' ? phoneEU('NL') : ORASE[order.delivery]?.country === 'DE' ? phoneEU('DE') : phoneRO(),
      deliveryData.tz,
      new Date(order.deliveryDate), new Date(order.deliveryDate),
      R(['08:00','09:00','10:00','11:00']),
      R(['16:00','17:00','18:00','19:00']),
      'UNLOD-' + RI(10000,99999),
      'Notificare obligatorie cu 2h înainte. Rampă ' + (deliveryData.country === 'NL' ? 'dreapta' : 'spate') + '.',
      new Date(), new Date(), COMPANY_ID, order.id, null
    ]);
  }
  console.log(`  ✅ ${ORDERS.length * 2} opriri comenzi`);

  // ════════════════════════════════════════════════════════
  // STEP 10: STOPS (pentru trips)
  // ════════════════════════════════════════════════════════
  console.log('📦 [9/20] STOPS (trip stops)...');
  for (let i = 0; i < TRIPS.length; i++) {
    const trip = TRIPS[i];
    const fromData = trip.fromData;
    const toData = trip.toData;

    // Stop plecare
    await client.query(`
      INSERT INTO stops (id, sequence, address, "companyName", country, city, "postalCode", "contactPerson", phone, email, "timeZone", reference, notes, latitude, longitude, status, "timeWindowMin", "timeWindowMax", type, eta, ata, "etaStatus", "distanceToStopKm", "completedAt", "createdAt", "updatedAt", "companyId", "tripId")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
    `, [
      UUID(), 1,
      R(STRADE_RO) + ' nr.' + RI(1,200),
      FIRME_RO[i % FIRME_RO.length],
      fromData.country, trip.fromCity, fromData.postal,
      PRENUME[i % PRENUME.length] + ' ' + NUME[i % NUME.length],
      phoneRO(), 'dispecer@' + trip.fromCity.toLowerCase().replace(/[^a-z]/g,'') + '.ro',
      fromData.tz, 'REF-' + RI(10000,99999),
      'Încărcare ' + trip.fromCity + '. Pregătiți documentele CMR.',
      fromData.lat + RF(-0.05,0.05,4), fromData.lng + RF(-0.05,0.05,4),
      trip.status === 'completed' ? 'completed' : trip.status === 'in_progress' ? 'completed' : 'pending',
      trip.plannedDep, addDays(trip.plannedDep, 0),
      'pickup',
      trip.plannedDep, trip.status !== 'planned' ? trip.plannedDep : null,
      'ON_TIME', 0,
      trip.status === 'completed' ? trip.plannedDep : null,
      new Date(), new Date(), COMPANY_ID, trip.id
    ]);

    // Stop livrare
    await client.query(`
      INSERT INTO stops (id, sequence, address, "companyName", country, city, "postalCode", "contactPerson", phone, email, "timeZone", reference, notes, latitude, longitude, status, "timeWindowMin", "timeWindowMax", type, eta, ata, "etaStatus", "distanceToStopKm", "completedAt", "createdAt", "updatedAt", "companyId", "tripId")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
    `, [
      UUID(), 2,
      toData.country === 'NL' ? 'Havenstraat ' + RI(1,200) : toData.country === 'DE' ? 'Industriestr. ' + RI(1,200) : R(STRADE_RO) + ' nr.' + RI(1,200),
      FIRME_RO[(i+3) % FIRME_RO.length],
      toData.country, trip.toCity, toData.postal,
      PRENUME[(i+3) % PRENUME.length] + ' ' + NUME[(i+3) % NUME.length],
      toData.country === 'NL' ? phoneEU('NL') : toData.country === 'DE' ? phoneEU('DE') : phoneRO(),
      'logistica@' + trip.toCity.toLowerCase().replace(/[^a-z]/g,'') + '.eu',
      toData.tz, 'REF-' + RI(10000,99999),
      'Descărcare ' + trip.toCity + '. POD obligatoriu. Notificare 2h înainte.',
      toData.lat + RF(-0.05,0.05,4), toData.lng + RF(-0.05,0.05,4),
      trip.status === 'completed' ? 'completed' : 'pending',
      trip.plannedArr, addDays(trip.plannedArr, 0),
      'delivery',
      trip.plannedArr, trip.status === 'completed' ? trip.plannedArr : null,
      Math.random() < 0.85 ? 'ON_TIME' : 'DELAYED',
      Math.ceil(trip.estKm),
      trip.status === 'completed' ? trip.plannedArr : null,
      new Date(), new Date(), COMPANY_ID, trip.id
    ]);
  }
  console.log(`  ✅ ${TRIPS.length * 2} stops`);

  // ════════════════════════════════════════════════════════
  // STEP 11: CARGO ITEMS - marfă pentru fiecare comandă
  // ════════════════════════════════════════════════════════
  console.log('📦 [10/20] CARGO ITEMS...');
  const cargoUnits = ['pallet','package','box','crate','roll','machine','coil','container','other'];
  for (let i = 0; i < ORDERS.length; i++) {
    const order = ORDERS[i];
    const numItems = RI(1,3);
    for (let j = 0; j < numItems; j++) {
      const unit = j === 0 ? 'pallet' : R(cargoUnits);
      const qty = unit === 'pallet' ? Math.ceil(order.pallets / numItems) : RI(1,20);
      const weight = Math.floor(order.pallets * RF(300,700,0) / numItems);
      const needsTemp = Math.random() < 0.12;
      await client.query(`
        INSERT INTO cargo_items (id, unit, description, "weightKg", "volumeCbm", ldm, "lengthCm", "widthCm", "heightCm", quantity, stackable, fragile, "requiresTemperatureControl", "temperatureMin", "temperatureMax", "insuredValue", currency, "stopRef", "createdAt", "updatedAt", "companyId", "orderId")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
      `, [
        UUID(), unit,
        order.cargo + (numItems > 1 ? ' - lot ' + (j+1) : ''),
        weight, RF(2,50,2), RF(0.4,4.5,2),
        unit === 'pallet' ? 120 : RI(40,120),
        unit === 'pallet' ? 80 : RI(40,100),
        unit === 'pallet' ? RI(100,220) : RI(30,150),
        qty,
        Math.random() < 0.65, Math.random() < 0.15,
        needsTemp, needsTemp ? RF(-20,0,0) : null, needsTemp ? RF(2,25,0) : null,
        RF(1000,50000,0), 'EUR',
        j === 0 ? 'P1' : 'P' + (j+1),
        new Date(), new Date(), COMPANY_ID, order.id
      ]);
    }
  }
  console.log('  ✅ Cargo items inserate');

  // ════════════════════════════════════════════════════════
  // STEP 12: SHIPMENTS - legate de comenzi și clienți
  // ════════════════════════════════════════════════════════
  console.log('📦 [11/20] SHIPMENTS...');
  const shipStatuses = ['planned','assigned','picked_up','in_transit','delivered','completed','cancelled'];
  for (let i = 0; i < Math.min(ORDERS.length, 25); i++) {
    const order = ORDERS[i];
    const client_rec = CLIENTS[i % CLIENTS.length];
    const pickupData = ORASE[order.pickup] || ORASE['București'];
    const deliveryData = ORASE[order.delivery] || ORASE['Rotterdam'];
    const pickupDate = new Date(order.pickupDate);
    const deliveryDate = new Date(order.deliveryDate);
    const twStartP = new Date(pickupDate.getTime() + 8*3600000);
    const twEndP = new Date(pickupDate.getTime() + 16*3600000);
    const twStartD = new Date(deliveryDate.getTime() + 8*3600000);
    const twEndD = new Date(deliveryDate.getTime() + 17*3600000);
    const ldm = (order.pallets / 33 * 13.6).toFixed(2) * 1;

    await client.query(`
      INSERT INTO shipments (id, "companyId", "orderId", "clientId", status, priority,
        "pickupAddress", "pickupCompanyName", "pickupCity", "pickupCountry", "pickupLatitude", "pickupLongitude",
        "pickupDate", "pickupTimeWindowStart", "pickupTimeWindowEnd", "pickupTimeWindowSoft", "pickupDurationMinutes",
        "deliveryAddress", "deliveryCompanyName", "deliveryCity", "deliveryCountry", "deliveryLatitude", "deliveryLongitude",
        "deliveryDate", "deliveryTimeWindowStart", "deliveryTimeWindowEnd", "deliveryTimeWindowSoft", "deliveryDurationMinutes",
        pallets, "weightKg", "loadingMeters", "volumeCbm", stackable, "loadingRule", "unloadingRule",
        reference, notes, "createdAt", "updatedAt")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39)
    `, [
      UUID(), COMPANY_ID, order.id, client_rec.id,
      shipStatuses[i % shipStatuses.length], RI(1,5),
      R(STRADE_RO) + ' nr.' + RI(1,200), client_rec.name,
      order.pickup, pickupData.country,
      pickupData.lat + RF(-0.05,0.05,4), pickupData.lng + RF(-0.05,0.05,4),
      pickupDate, twStartP, twEndP, true, RI(30,120),
      (deliveryData.country === 'NL' ? 'Havenstraat ' : 'Industriestr. ') + RI(1,200),
      FIRME_RO[(i+5) % FIRME_RO.length],
      order.delivery, deliveryData.country,
      deliveryData.lat + RF(-0.05,0.05,4), deliveryData.lng + RF(-0.05,0.05,4),
      deliveryDate, twStartD, twEndD, true, RI(30,120),
      order.pallets, RF(5000,24000,0), ldm, RF(15,100,0),
      Math.random() < 0.7, R(['lifo','fifo','flexible']), R(['lifo','fifo','flexible']),
      'SHP-' + RI(10000,99999),
      order.pallets + ' paleți ' + order.cargo + ' - ' + order.pickup + ' → ' + order.delivery,
      new Date(), new Date()
    ]);
  }
  console.log('  ✅ Shipments inserate');

  // ════════════════════════════════════════════════════════
  // STEP 13: INVOICES - cu toate câmpurile
  // ════════════════════════════════════════════════════════
  console.log('📦 [12/20] INVOICES...');
  const INVOICES = [];
  const invStatuses = ['draft','approved','sent','viewed','paid','overdue','cancelled'];
  const vatTypes = ['NORMAL','REVERSE_CHARGE','EXEMPT'];
  for (let i = 0; i < 25; i++) {
    const id = UUID();
    const order = ORDERS[i % ORDERS.length];
    const client_rec = CLIENTS[i % CLIENTS.length];
    const trip = TRIPS[i % TRIPS.length];
    const issueDate = new Date(RD('2024-01-01','2026-09-10'));
    const dueDate = addDays(issueDate, R([15,30,45,60]));
    const subtotal = order.price || RF(500,5000,2);
    const vatPct = R([0,19,0,0]);
    const vatAmt = subtotal * vatPct / 100;
    const fuelSurcharge = RF(0,subtotal*0.10,2);
    const tollCosts = RF(0,200,2);
    const extraCosts = RF(0,100,2);
    const total = subtotal + vatAmt + fuelSurcharge + tollCosts + extraCosts;
    const status = invStatuses[i % invStatuses.length];
    const paidAt = status === 'paid' ? new Date(issueDate.getTime() + RI(3,25)*86400000) : null;

    await client.query(`
      INSERT INTO invoices (
        id, company_id, invoice_number, customer_id, order_id, status, currency,
        subtotal_amount, tax_amount, total_amount, paid_amount,
        issue_date, due_date, paid_at, created_at, updated_at,
        "invoiceNumber", "clientId", "tripId", amount, "vatPercent", subtotal, "vatAmount",
        "fuelSurcharge", "extraCosts", "tollCosts", "vatType", total,
        "issueDate", "dueDate", "createdAt", "updatedAt", notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33)
    `, [
      id, COMPANY_ID, 'FACT-' + String(2024000+i+1),
      order.customerId, order.id, status, 'EUR',
      subtotal.toString(), vatAmt.toString(), total.toString(),
      status === 'paid' ? total.toString() : '0',
      issueDate, dueDate, paidAt, new Date(), new Date(),
      // camelCase
      'FACT-' + String(2024000+i+1), client_rec.id, trip.id,
      total, vatPct, subtotal, vatAmt,
      fuelSurcharge, extraCosts, tollCosts,
      R(vatTypes), total,
      issueDate, dueDate,
      new Date(), new Date(),
      'Factură transport ' + order.cargo + ': ' + order.pickup + ' → ' + order.delivery + '. ' + order.pallets + ' paleți.'
    ]);
    INVOICES.push({ id, clientId: client_rec.id, orderId: order.id, total, status, issueDate, dueDate, customerId: order.customerId });
  }
  console.log(`  ✅ ${INVOICES.length} facturi`);

  // Invoice Items
  console.log('📦 [12b] INVOICE ITEMS...');
  for (let i = 0; i < INVOICES.length; i++) {
    const inv = INVOICES[i];
    const order = ORDERS[i % ORDERS.length];
    const desc1 = 'Transport ' + order.cargo + ': ' + order.pickup + ' → ' + order.delivery;
    const price1 = RF(400,3000,2);
    await client.query(`INSERT INTO invoice_items (id, description, quantity, "unitPrice", "vatRate", total, "invoiceId") VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [UUID(), desc1, 1, price1, 19, price1 * 1.19, inv.id]);

    if (Math.random() > 0.5) {
      const desc2 = R(['Taxă autostradă','Suprataxă combustibil','Taxă vignietă','Așteptare descărcare']);
      const price2 = RF(30,300,2);
      await client.query(`INSERT INTO invoice_items (id, description, quantity, "unitPrice", "vatRate", total, "invoiceId") VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [UUID(), desc2, 1, price2, 19, price2 * 1.19, inv.id]);
    }
  }
  console.log('  ✅ Invoice items');

  // ════════════════════════════════════════════════════════
  // STEP 14: PAYMENTS
  // ════════════════════════════════════════════════════════
  console.log('📦 [13/20] PAYMENTS...');
  const payMethods = ['bank_transfer','bank_transfer','bank_transfer','cash','card'];
  for (let i = 0; i < INVOICES.length; i++) {
    const inv = INVOICES[i];
    if (!['paid','overdue'].includes(inv.status)) continue;
    const recvDate = new Date(inv.issueDate.getTime() + RI(3,40)*86400000);
    await client.query(`
      INSERT INTO payments (id, company_id, invoice_id, customer_id, amount, method, reference, received_at, created_at, date, "createdAt", "invoiceId", status, "updatedAt")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    `, [
      UUID(), COMPANY_ID, inv.id, inv.customerId,
      inv.total.toString(), R(payMethods),
      'PAY-' + RI(100000,999999),
      recvDate, new Date(), recvDate, new Date(),
      inv.id, 'confirmed', new Date()
    ]);
  }
  // Plus payments suplimentare
  for (let i = 0; i < 10; i++) {
    const inv = INVOICES[i % INVOICES.length];
    const recvDate = new Date(RD('2024-01-01','2026-09-10'));
    await client.query(`
      INSERT INTO payments (id, company_id, invoice_id, customer_id, amount, method, reference, received_at, created_at, date, "createdAt", "invoiceId", status, "updatedAt")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    `, [
      UUID(), COMPANY_ID, inv.id, inv.customerId,
      RF(200,3000,2).toString(), R(payMethods),
      'PAY-' + RI(100000,999999),
      recvDate, new Date(), recvDate, new Date(),
      inv.id, 'confirmed', new Date()
    ]);
  }
  const payCount = (await client.query(`SELECT COUNT(*) FROM payments`)).rows[0].count;
  console.log(`  ✅ ${payCount} plăți`);

  // ════════════════════════════════════════════════════════
  // STEP 15: EXPENSES - costuri operaționale
  // ════════════════════════════════════════════════════════
  console.log('📦 [14/20] EXPENSES...');
  const expCategories = ['fuel','maintenance','accounting','salary','toll','other'];
  const expDescriptions = {
    fuel: ['Motorină A1 Vest','Motorină OMV Austria','Motorină Shell Germania','Combustibil Total Franța','Motorină MOL Ungaria','Adblue 20L'],
    maintenance: ['Schimb ulei motor','Reparație anvelope','Diagnoza electronică','Schimb filtre','Reparație frâne'],
    accounting: ['Servicii contabilitate lunară','Audit extern','Consultanță fiscală','Legalizare documente'],
    salary: ['Avans salariu șofer','Diurnă internațională','Bonus productivitate','Regularizare salariu'],
    toll: ['Taxă autostradă A2','Taxă pod Fetești','Vignietă DE 10 zile','Vignietă AT anual','Bridge toll NL','Taxă Eurotunnel','Vignietă CZ','Taxă ferry'],
    other: ['Parcare camion Rotterdam Port','Spălare camion automat','Cantare TIR','Dezinfecție trailer','Diurnă șofer'],
  };
  for (let i = 0; i < 25; i++) {
    const cat = expCategories[i % expCategories.length];
    const trip = TRIPS[i % TRIPS.length];
    const descs = expDescriptions[cat];
    const amounts = { fuel:RF(300,1500,2), maintenance:RF(200,4000,2), accounting:RF(100,600,2), salary:RF(3000,8000,2), toll:RF(25,350,2), other:RF(30,500,2) };
    await client.query(`
      INSERT INTO expenses (id, amount, currency, category, description, date, "createdAt", "updatedAt")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `, [
      UUID(), amounts[cat], 'EUR', cat,
      R(descs), new Date(RD('2024-01-01','2026-09-10')),
      new Date(), new Date()
    ]);
  }
  console.log('  ✅ 25 cheltuieli');

  // TRIP COSTS - legate de trips
  console.log('📦 [14b] TRIP COSTS...');
  const tripCostTypes = ['fuel','toll','parking','ferry','other','extra'];
  const tripCostDescs = ['Motorină autostradă','Taxă pod','Parcare noapte port','Ferry Dover-Calais','Așteptare la vamă','Extra descărcare manuală','Curățare trailer','Taxă vignietă'];
  for (let i = 0; i < 25; i++) {
    const trip = TRIPS[i % TRIPS.length];
    const drv = trip.driver || DRIVERS[i % DRIVERS.length];
    const trk = trip.truck;
    await client.query(`
      INSERT INTO trip_costs (id, type, amount, description, "driverId", "truckId", category, "createdAt", "tripId")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [
      UUID(), R(tripCostTypes), RF(25,1500,2),
      R(tripCostDescs),
      drv ? drv.id.toString() : null,
      trk ? trk.id.toString() : null,
      R(['operational','administrative','transport']),
      new Date(), trip.id
    ]);
  }
  console.log('  ✅ 25 costuri curse');

  // ════════════════════════════════════════════════════════
  // STEP 16: MAINTENANCE - cu toate câmpurile
  // ════════════════════════════════════════════════════════
  console.log('📦 [15/20] MAINTENANCE...');
  const maintTypes = ['preventive','corrective','inspection'];
  const maintStatuses = ['scheduled','in_progress','done'];
  await client.query(`DELETE FROM maintenance`); // resetăm (avem duplicat din script anterior)
  for (let i = 0; i < 25; i++) {
    const truck = TRUCKS[i % TRUCKS.length];
    const schedDate = new Date(RD('2024-01-01','2027-06-30'));
    const isDone = Math.random() > 0.4;
    const doneDate = isDone ? addDays(schedDate, RI(0,5)) : null;
    const partsCost = RF(50,2000,2);
    const laborCost = RF(50,800,2);
    await client.query(`
      INSERT INTO maintenance (id, type, description, "scheduledDate", "completedDate", cost, "partsCost", "laborCost", "odometerKm", "serviceProvider", status, notes, "createdAt", "updatedAt", "truckId")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    `, [
      UUID(), R(maintTypes),
      R(DESCRIERI_MENTENANTA),
      schedDate, doneDate, partsCost + laborCost, partsCost, laborCost,
      RI(50000,800000), R(SERVICE_PROVIDERS),
      isDone ? 'done' : R(maintStatuses),
      'Număr comandă service: SO-' + RI(10000,99999) + '. Toate piesele originale OEM.',
      new Date(), new Date(), truck.id
    ]);
  }
  console.log('  ✅ 25 înregistrări mentenanță');

  // ════════════════════════════════════════════════════════
  // STEP 17: PAYROLLS - state de plată lunare
  // ════════════════════════════════════════════════════════
  console.log('📦 [16/20] PAYROLLS...');
  const payrollStatuses = ['draft','paid','sent'];
  const months = [
    [1,2024],[2,2024],[3,2024],[4,2024],[5,2024],[6,2024],[7,2024],[8,2024],[9,2024],[10,2024],[11,2024],[12,2024],
    [1,2025],[2,2025],[3,2025],[4,2025],[5,2025],[6,2025],[7,2025],[8,2025],[9,2025],[10,2025],[11,2025],[12,2025],[1,2026]
  ];
  for (let i = 0; i < 25; i++) {
    const drv = DRIVERS[i % DRIVERS.length];
    const [month, year] = months[i % months.length];
    const grossSalary = RF(3500,7500,2);
    const taxAmount = grossSalary * RF(0.40,0.45,3);
    const netSalary = grossSalary - taxAmount;
    const holidayAllowance = grossSalary * 0.0804;
    const daysWorked = RI(18,23);
    const dailyAllowance = RF(80,150,2);
    const totalAllowance = daysWorked * dailyAllowance;
    const bonuses = Math.random() > 0.6 ? RF(100,800,2) : 0;
    const deductions = Math.random() > 0.7 ? RF(50,300,2) : 0;
    const totalNetToPay = netSalary + totalAllowance + bonuses - deductions;

    await client.query(`
      INSERT INTO payrolls (id, month, year, "grossSalary", "taxAmount", "netSalary", "holidayAllowance", "dailyAllowance", "daysWorked", "totalAllowance", bonuses, deductions, "totalNetToPay", status, "createdAt", "updatedAt", "userId")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    `, [
      UUID(), month, year, grossSalary, taxAmount, netSalary,
      holidayAllowance, dailyAllowance, daysWorked, totalAllowance,
      bonuses, deductions, totalNetToPay,
      R(payrollStatuses), new Date(), new Date(), drv.userId
    ]);
  }
  console.log('  ✅ 25 state de plată');

  // ════════════════════════════════════════════════════════
  // STEP 18: SETTLEMENTS - deconturi șoferi
  // ════════════════════════════════════════════════════════
  console.log('📦 [17/20] SETTLEMENTS...');
  const settStatuses = ['draft','approved','paid'];
  for (let i = 0; i < 25; i++) {
    const drv = DRIVERS[i % DRIVERS.length];
    const [month, year] = months[i % months.length];
    const tripCount = RI(3,12);
    const totalDist = RF(3000,15000,0);
    const grossPay = RF(2500,8000,2);
    const advances = Math.random() > 0.5 ? RF(200,1000,2) : 0;
    const deductions = Math.random() > 0.6 ? RF(50,400,2) : 0;
    const netPay = grossPay - advances - deductions;
    const tripsJson = JSON.stringify(Array.from({length:tripCount}, (_,k) => 'TRIP-' + String(k+1+i*10).padStart(4,'0')));

    await client.query(`
      INSERT INTO settlements (id, "driverName", month, year, "payMode", "payRate", "tripCount", "totalDistance", "totalRevenue", "grossPay", advances, deductions, "netPay", status, notes, trips, "createdAt", "updatedAt", "driverId")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
    `, [
      UUID(),
      drv.prenume + ' ' + drv.numeFam,
      month, year, drv.payMode,
      drv.payMode === 'per_km' ? RF(0.12,0.28,3) : RI(3000,7000),
      tripCount, totalDist, RF(totalDist*1.2,totalDist*2.5,2),
      grossPay, advances, deductions, netPay,
      R(settStatuses),
      'Decontare ' + String(month).padStart(2,'0') + '/' + year + ' - ' + drv.prenume + ' ' + drv.numeFam + '. ' + tripCount + ' curse efectuate, ' + Math.floor(totalDist) + ' km parcurși.',
      tripsJson,
      new Date(), new Date(), drv.id
    ]);
  }
  console.log('  ✅ 25 deconturi');

  // ════════════════════════════════════════════════════════
  // STEP 19: LEADS - lead-uri de transport
  // ════════════════════════════════════════════════════════
  console.log('📦 [18/20] LEADS...');
  const leadStatuses = ['new','contacted','quoted','accepted','rejected'];
  const leadSources = ['website','referral','phone','email','linkedin','fair','cold_call'];
  const leadRoutes = [
    {from:'România',to:'Olanda'}, {from:'Cluj-Napoca',to:'Rotterdam'},
    {from:'București',to:'Amsterdam'}, {from:'Olanda',to:'România'},
    {from:'Rotterdam',to:'Timișoara'}, {from:'Germania',to:'România'},
    {from:'România',to:'Germania'}, {from:'Austria',to:'România'},
    {from:'Belgia',to:'România'}, {from:'România',to:'Franța'},
    {from:'Cehia',to:'România'}, {from:'Polonia',to:'România'},
    {from:'Constanța',to:'Hamburg'}, {from:'Galați',to:'Rotterdam'},
    {from:'Iași',to:'Eindhoven'}, {from:'Brașov',to:'Utrecht'},
    {from:'Sibiu',to:'Amsterdam'}, {from:'Craiova',to:'Rotterdam'},
    {from:'România',to:'Belgia'}, {from:'Ungaria',to:'România'},
    {from:'România',to:'Polonia'}, {from:'Slovacia',to:'România'},
    {from:'România',to:'Austria'}, {from:'Ploiești',to:'München'},
    {from:'Bacău',to:'Frankfurt'},
  ];
  for (let i = 0; i < 25; i++) {
    const lr = leadRoutes[i % leadRoutes.length];
    const prenume = PRENUME[i % PRENUME.length];
    const numeFam = NUME[i % NUME.length];
    const firma = FIRME_RO[(i+9) % FIRME_RO.length];
    const pallets = R([33,33,26,20,14,10,8,18,24,33]);
    const weight = Math.floor(pallets * RF(400,700,0));
    await client.query(`
      INSERT INTO leads (id, name, phone, email, "from", "to", weight, type, notes, source, pallets, "estimatedPrice", status, "createdAt", "updatedAt")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    `, [
      UUID(),
      prenume + ' ' + numeFam + ' - ' + firma,
      phoneRO(),
      prenume.toLowerCase() + '.' + numeFam.toLowerCase() + RI(1,99) + '@' + firma.toLowerCase().replace(/\s+/g,'').replace(/[^a-z0-9]/g,'').substring(0,15) + '.ro',
      lr.from, lr.to, weight.toString(),
      R(['FTL','LTL','Groupage','Dedicated']),
      'Interesat de transport regulat ' + lr.from + ' → ' + lr.to + '. Volum estimat ' + RI(5,80) + ' curse/lună. ' + pallets + ' paleți per cursă.',
      R(leadSources), pallets.toString(),
      RF(500,4500,0).toString(),
      leadStatuses[i % leadStatuses.length],
      new Date(RD('2024-01-01','2026-09-10')), new Date()
    ]);
  }
  console.log('  ✅ 25 lead-uri');

  // ════════════════════════════════════════════════════════
  // STEP 20: NOTIFICATIONS
  // ════════════════════════════════════════════════════════
  console.log('📦 [19/20] NOTIFICATIONS...');
  const notifTypes = ['trip_started','trip_completed','maintenance_due','payment_received','invoice_overdue','new_order','document_expiring','driver_absence','trip_delayed','fuel_alert'];
  const notifTitles = {
    trip_started: 'Cursă pornită', trip_completed: 'Cursă finalizată',
    maintenance_due: 'Mentenanță programată', payment_received: 'Plată primită',
    invoice_overdue: 'Factură restantă', new_order: 'Comandă nouă',
    document_expiring: 'Document expiră curând', driver_absence: 'Absență șofer',
    trip_delayed: 'Cursă întârziată', fuel_alert: 'Alertă combustibil',
  };
  for (let i = 0; i < 25; i++) {
    const type = notifTypes[i % notifTypes.length];
    const trip = TRIPS[i % TRIPS.length];
    const drv = DRIVERS[i % DRIVERS.length];
    const trk = TRUCKS[i % TRUCKS.length];
    const messages = {
      trip_started: `Camionul ${trk.plateNr} (${drv.prenume} ${drv.numeFam}) a pornit din ${trip.fromCity} spre ${trip.toCity}.`,
      trip_completed: `Cursa ${trip.fromCity} → ${trip.toCity} a fost finalizată cu succes. ${Math.floor(trip.estKm)} km parcurși.`,
      maintenance_due: `Camionul ${trk.plateNr} ajunge la revizie în curând. Programați service.`,
      payment_received: `Plată de ${RF(500,5000,0)} EUR primită de la ${CLIENTS[i%CLIENTS.length].name}.`,
      invoice_overdue: `Factura FACT-${2024000+i+1} de ${RF(800,5000,0)} EUR este restantă.`,
      new_order: `Comandă nouă: ${trip.fromCity} → ${trip.toCity}, ${R([33,26,20,14])} paleți.`,
      document_expiring: `Vignietă DE a camionului ${trk.plateNr} expiră în 7 zile.`,
      driver_absence: `Șoferul ${drv.prenume} ${drv.numeFam} a raportat absență pentru mâine.`,
      trip_delayed: `Cursa ${trip.fromCity} → ${trip.toCity} înregistrează o întârziere de ${RI(30,240)} minute.`,
      fuel_alert: `Consumul neobișnuit de combustibil detectat la camionul ${trk.plateNr}.`,
    };
    await client.query(`
      INSERT INTO notifications (id, type, title, message, "isRead", "relatedId", "createdAt")
      VALUES ($1,$2,$3,$4,$5,$6,$7)
    `, [
      UUID(), type, notifTitles[type], messages[type] || 'Notificare sistem.',
      Math.random() < 0.45, trip.id,
      new Date(RD('2024-06-01','2026-09-12'))
    ]);
  }
  console.log('  ✅ 25 notificări');

  // ════════════════════════════════════════════════════════
  // STEP 21: CLIENT RATES - tarife per client și rută
  // ════════════════════════════════════════════════════════
  console.log('📦 [20/20] CLIENT RATES...');
  const rateTypes = ['per_km','fixed','per_trip','per_pallet'];
  const vehicleTypes = ['mega','standard','frigo','walking_floor','flatbed'];
  for (let i = 0; i < 25; i++) {
    const cl = CLIENTS[i % CLIENTS.length];
    const origCity = R(RO_CITIES);
    const destCity = R([...NL_CITIES, 'Hamburg', 'München', 'Wien', 'Praha', 'Varșovia']);
    const origData = ORASE[origCity];
    const destData = ORASE[destCity];
    const priceType = R(rateTypes);
    const basePrice = priceType === 'per_km' ? RF(1.0,2.2,3) : priceType === 'per_pallet' ? RF(40,150,2) : RF(700,4500,2);
    const validFrom = new Date(RD('2024-01-01','2025-06-01'));
    const validUntil = addDays(validFrom, R([180,365,365,730]));
    await client.query(`
      INSERT INTO client_rates (id, "rateName", "vehicleType", "priceType", "originCountry", "originCity", "destinationCountry", "destinationCity", "basePrice", currency, "fuelSurchargePercent", "tollIncluded", "validFrom", "validUntil", notes, active, "clientId")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    `, [
      UUID(),
      origCity + ' → ' + destCity + ' [' + R(vehicleTypes) + ']',
      R(vehicleTypes), priceType,
      origData.country, origCity,
      destData.country, destCity,
      basePrice, 'EUR',
      RF(3,15,1), Math.random() < 0.4,
      validFrom, validUntil,
      'Tarif negociat ' + cl.name + '. ' + (priceType === 'per_km' ? basePrice + ' EUR/km' : priceType === 'per_pallet' ? basePrice + ' EUR/palet' : basePrice + ' EUR/cursă') + '.',
      true, cl.id
    ]);
  }
  console.log('  ✅ 25 tarife clienți');

  // ════════════════════════════════════════════════════════
  // FINAL: VERIFICARE FINALĂ
  // ════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 VERIFICARE FINALĂ - NUMĂR RÂNDURI:');
  console.log('═══════════════════════════════════════════════════════');
  const finalTables = [
    'clients','client_locations','client_rates',
    'customers','drivers','trucks','trailers',
    'trips','orders','order_stops','stops',
    'cargo_items','shipments',
    'invoices','invoice_items','payments',
    'expenses','trip_costs','maintenance',
    'payrolls','settlements','leads','notifications',
    'driver_documents','truck_documents',
  ];
  let allOk = true;
  for (const t of finalTables) {
    const r = await client.query(`SELECT COUNT(*) FROM "${t}"`);
    const n = parseInt(r.rows[0].count);
    const ok = n >= 20 ? '✅' : n > 0 ? '⚠️ ' : '❌';
    if (n < 20) allOk = false;
    console.log(`  ${ok} ${t.padEnd(28)} ${String(n).padStart(4)} rânduri`);
  }
  console.log('═══════════════════════════════════════════════════════');
  
  // Admin protection check
  console.log('\n🔒 CONTURI ADMIN PROTEJATE:');
  const admins = await client.query(`SELECT email, role FROM users WHERE role='admin' ORDER BY email`);
  admins.rows.forEach(a => console.log(`  ✅ ${a.email}`));

  console.log('\n' + (allOk ? '🎉 TOTUL E COMPLET! Toate tabelele au 20+ rânduri.' : '⚠️  Unele tabele pot necesita atenție.'));
  console.log('\n🗂️  STATISTICI:');
  console.log(`  • Curse spre/dinspre Olanda: ${TRIPS.filter(t => NL_CITIES.includes(t.fromCity) || NL_CITIES.includes(t.toCity)).length} curse + ${ORDERS.filter(o => NL_CITIES.includes(o.pickup) || NL_CITIES.includes(o.delivery)).length} comenzi`);
  console.log(`  • Comenzi neasignate (unassigned): ${ORDERS.filter(o => !o.tripId).length}`);
  console.log(`  • Comenzi cu 33 paleți: ${ORDERS.filter(o => o.pallets === 33).length}`);
  console.log(`  • Comenzi cu mai puțini paleți: ${ORDERS.filter(o => o.pallets < 33).length}`);

  await client.end();
}

main().catch(e => {
  console.error('\n❌ EROARE FATALĂ:', e.message);
  console.error(e.stack);
  process.exit(1);
});
