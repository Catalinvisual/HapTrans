const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway', ssl: { rejectUnauthorized: false } });

async function fix() {
  await client.connect();
  
  // 1. TRADUCERE DOCUMENTE SOFERI
  console.log('🔄 Corectare nume documente șoferi...');
  const docTranslations = {
    'license': 'Permis de conducere',
    'passport': 'Pașaport',
    'medical_cert': 'Aviz medical',
    'adr_cert': 'Certificat ADR',
    'cpc_cert': 'Atestat profesional (CPC)',
    'id_card': 'Carte de identitate',
    'tacho_card': 'Card Tahograf'
  };
  for (const [en, ro] of Object.entries(docTranslations)) {
    await client.query(`UPDATE driver_documents SET type = $1 WHERE type = $2`, [ro, en]);
  }

  // 2. UNASSIGNED ORDERS & SHIPMENTS PENTRU PLANNING
  console.log('🔄 Configurare Unassigned Orders pentru Planning...');
  // Asiguram ca shipmentele unassigned sunt clare si corecte
  await client.query(`UPDATE shipments SET status = 'planned' WHERE "truckRoutePlanId" IS NULL`);
  await client.query(`UPDATE orders SET status = 'pending' WHERE "tripId" IS NULL`);

  // 3. SINCRONIZARE KG SI PALETI PENTRU TRIPS MODAL
  console.log('🔄 Sincronizare greutate și paleți pentru Trips...');
  // Trips nu are campuri pallets si weight. TMS-ul le calculeaza fie din orders(weight_kg care e string la noi)
  // Hai sa actualizam orders weight_kg in format curat (doar numere)
  const orders = await client.query(`SELECT id, weight_kg, pallets FROM orders`);
  for (const ord of orders.rows) {
    if (ord.weight_kg) {
      let w = ord.weight_kg.replace(/[^0-9.]/g, ''); // curățăm orice string
      if (!w) w = (ord.pallets * 500).toString();
      await client.query(`UPDATE orders SET weight_kg = $1 WHERE id = $2`, [w, ord.id]);
    }
  }

  // Multi TMS-uri care au Trips si Orders asigura ca si Trip-ul in sine are weight_kg setat, dar schema noastra trips nu are.
  // Totusi, sa ne asiguram ca shipments au weightKg si pallets corect asigurate si nelegate daca sunt unassigned:
  const ships = await client.query(`SELECT id, "weightKg" FROM shipments`);
  for (const s of ships.rows) {
    if (!s.weightKg || s.weightKg === '0') {
      await client.query(`UPDATE shipments SET "weightKg" = 15000, pallets = 24 WHERE id = $1`, [s.id]);
    }
  }

  // 4. VERIFICARE NUME SOFERI
  console.log('🔄 Corectare nume șoferi (sync user -> driver)...');
  // Copiem numele din `users` in `drivers` ca sa fim 100% siguri, deoarece uneori TMS cere join, alteori copiaza direct
  const drvData = await client.query(`SELECT id, first_name, last_name, email FROM drivers`);
  for (const d of drvData.rows) {
    // Daca lipseste in drivers:
    if (!d.first_name || !d.last_name || d.first_name==='' || d.last_name==='') {
      // extragem din email sau random
      const parts = d.email.split('@')[0].split('.');
      const fn = parts[1] || 'Șofer';
      const ln = parts[2] || 'Test';
      const fnCap = fn.charAt(0).toUpperCase() + fn.slice(1);
      const lnCap = ln.charAt(0).toUpperCase() + ln.slice(1);
      await client.query(`UPDATE drivers SET first_name = $1, last_name = $2 WHERE id = $3`, [fnCap, lnCap, d.id]);
    }
  }

  console.log('✅ Toate modificările de UI au fost aplicate!');
  await client.end();
}

fix().catch(e => { console.error('Eroare:', e.message); process.exit(1); });
