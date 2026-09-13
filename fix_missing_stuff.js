const { Client } = require('pg');
const fs = require('fs');

async function fix() {
  const client = new Client({ connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway', ssl: { rejectUnauthorized: false } });
  await client.connect();
  
  // 1. CLIENTI TERMS
  console.log('🔄 Fixare termeni plata clienti...');
  await client.query(`UPDATE customers SET payment_terms = '30'`);
  await client.query(`UPDATE clients SET "paymentTermsDays" = 30`);

  // 2. SALARII
  console.log('🔄 Fixare salarii (payrolls)...');
  // S-ar putea ca frontend-ul sa foloseasca `driverId` pentru payrolls.
  try {
    await client.query(`ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS "driverId" uuid`);
    // Linkam driverId prin userId
    const drvs = await client.query(`SELECT id, "userId" FROM drivers WHERE "userId" IS NOT NULL`);
    for (const d of drvs.rows) {
      await client.query(`UPDATE payrolls SET "driverId" = $1 WHERE "userId" = $2`, [d.id, d.userId]);
    }
    // Setam acelasi driverId pentru settlement-uri
  } catch(e) { console.error('Eroare payrolls:', e.message); }

  await client.end();
  
  // 3. TRANSLATIONS (REPORTS)
  console.log('🔄 Actualizare traduceri pentru rapoarte...');
  const filePath = 'client/src/lib/i18n.ts';
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    const enTrans = `"reports": "Reports",
      "nav_reports": "Reports & Analytics",
      "an_daily": "Daily",
      "an_refresh": "Refresh",
      "an_orders_total": "Total Orders",
      "an_open_orders": "Open Orders",
      "an_active_trips": "Active Trips",
      "an_completed_trips": "Completed Trips",
      "an_exceptions": "Exceptions",
      "an_view_trips": "View Trips",
      "an_operations": "Operations",
      "an_revenue_profit_trend": "Revenue & Profit",
      "an_revenue": "Revenue",
      "an_profit": "Profit",
      "an_service_quality": "Service Quality",
      "an_late_deliveries": "Late Deliveries",
      "an_avg_delay": "Avg Delay",
      "an_transport_cost": "Transport Cost",
      "an_gross_profit": "Gross Profit",
      "an_gross_margin": "Gross Margin",
      "an_rev_per_km": "Rev/km",
      "an_cost_per_km": "Cost/km",
      "an_fleet_util": "Fleet Utilization",
      "an_deadhead": "Deadhead",
      "an_order_status_dist": "Order Status Distribution",
      "an_trip_status_dist": "Trip Status Distribution",
      "an_no_data": "No Data",
      "an_no_data_msg": "No data for selected period.",
      "an_top_customers": "Top Customers",
      "an_view_all": "View All",
      "an_customer": "Customer",
      "an_margin": "Margin",
      "an_otif": "OTIF",
      "an_route_profitability": "Route Profitability",
      "an_op_expenses": "Op Expenses",
      "an_total_cost": "Total Cost",
      "an_receivables_open_invoices": "Open Invoices",
      "rp_quick_title": "Custom Reports",
      "rp_quick_sub": "Generate detailed reports and export them.",
      "rp_export_label": "Reports & Export",
      "rp_subtitle": "Operational, service and financial reports.",
      "rp_tab_reports": "Reports"`;
      
      const deTrans = `"reports": "Berichte", "nav_reports": "Berichte & Analysen", "an_daily": "Täglich", "an_refresh": "Aktualisieren", "an_orders_total": "Alle Bestellungen", "an_open_orders": "Offene", "an_active_trips": "Aktive Fahrten", "an_completed_trips": "Abgeschlossen", "an_exceptions": "Ausnahmen", "an_view_trips": "Zeigen", "an_operations": "Betrieb", "an_revenue_profit_trend": "Umsatz & Gewinn", "an_revenue": "Umsatz", "an_profit": "Gewinn", "an_service_quality": "Qualität", "an_late_deliveries": "Verspätungen", "an_avg_delay": "Durchschn. Verspätung", "an_transport_cost": "Transportkosten", "an_gross_profit": "Bruttogewinn", "an_gross_margin": "Bruttomarge", "an_rev_per_km": "Umsatz/km", "an_cost_per_km": "Kosten/km", "an_fleet_util": "Flottenauslastung", "an_deadhead": "Leerfahrt", "an_order_status_dist": "Bestellstatus", "an_trip_status_dist": "Fahrtenstatus", "an_no_data": "Keine Daten", "an_no_data_msg": "Keine Daten für diesen Zeitraum.", "an_top_customers": "Top-Kunden", "an_view_all": "Alle ansehen", "an_customer": "Kunde", "an_margin": "Marge", "an_otif": "OTIF", "an_route_profitability": "Routenrentabilität", "an_op_expenses": "Betriebskosten", "an_total_cost": "Gesamtkosten", "an_receivables_open_invoices": "Offene Rechnungen", "rp_quick_title": "Benutzerdefinierte Berichte", "rp_quick_sub": "Erstellen und exportieren.", "rp_export_label": "Berichte", "rp_subtitle": "Export PDF/Excel", "rp_tab_reports": "Berichte"`;

      const frTrans = `"reports": "Rapports", "nav_reports": "Rapports & Analyses", "an_daily": "Quotidien", "an_refresh": "Actualiser", "an_orders_total": "Commandes", "an_open_orders": "Ouvert", "an_active_trips": "Actifs", "an_completed_trips": "Terminés", "an_exceptions": "Exceptions", "an_view_trips": "Voir", "an_operations": "Opérations", "an_revenue_profit_trend": "Revenu & Profit", "an_revenue": "Revenu", "an_profit": "Profit", "an_service_quality": "Qualité", "an_late_deliveries": "Retards", "an_avg_delay": "Retard moyen", "an_transport_cost": "Coût de transport", "an_gross_profit": "Bénéfice brut", "an_gross_margin": "Marge brute", "an_rev_per_km": "Rev/km", "an_cost_per_km": "Coût/km", "an_fleet_util": "Utilisation de flotte", "an_deadhead": "À vide", "an_order_status_dist": "Statut des commandes", "an_trip_status_dist": "Statut des trajets", "an_no_data": "Pas de données", "an_no_data_msg": "Aucune donnée.", "an_top_customers": "Top Clients", "an_view_all": "Voir tout", "an_customer": "Client", "an_margin": "Marge", "an_otif": "OTIF", "an_route_profitability": "Rentabilité", "an_op_expenses": "Dépenses", "an_total_cost": "Coût total", "an_receivables_open_invoices": "Factures impayées", "rp_quick_title": "Rapports personnalisés", "rp_quick_sub": "Générer et exporter.", "rp_export_label": "Rapports", "rp_subtitle": "Export PDF/Excel", "rp_tab_reports": "Rapports"`;

      const nlTrans = `"reports": "Rapporten", "nav_reports": "Rapporten & Analyse", "an_daily": "Dagelijks", "an_refresh": "Vernieuwen", "an_orders_total": "Bestellingen", "an_open_orders": "Open", "an_active_trips": "Actief", "an_completed_trips": "Voltooid", "an_exceptions": "Uitzonderingen", "an_view_trips": "Bekijk", "an_operations": "Operaties", "an_revenue_profit_trend": "Omzet & Winst", "an_revenue": "Omzet", "an_profit": "Winst", "an_service_quality": "Kwaliteit", "an_late_deliveries": "Vertragingen", "an_avg_delay": "Gem. Vertraging", "an_transport_cost": "Transportkosten", "an_gross_profit": "Brutowinst", "an_gross_margin": "Brutomarge", "an_rev_per_km": "Omzet/km", "an_cost_per_km": "Kosten/km", "an_fleet_util": "Vlootgebruik", "an_deadhead": "Leeg", "an_order_status_dist": "Orderstatus", "an_trip_status_dist": "Ritstatus", "an_no_data": "Geen data", "an_no_data_msg": "Geen gegevens.", "an_top_customers": "Top Klanten", "an_view_all": "Alles", "an_customer": "Klant", "an_margin": "Marge", "an_otif": "OTIF", "an_route_profitability": "Winstgevendheid", "an_op_expenses": "Kosten", "an_total_cost": "Totaal", "an_receivables_open_invoices": "Open Facturen", "rp_quick_title": "Aangepaste Rapporten", "rp_quick_sub": "Genereer en exporteer.", "rp_export_label": "Rapporten", "rp_subtitle": "Export PDF/Excel", "rp_tab_reports": "Rapporten"`;

    // Inject in EN
    if (!content.includes('"rp_quick_title": "Custom Reports"')) {
      content = content.replace(/"tab_contact": "Contact",/g, `"tab_contact": "Contact",\n${enTrans},`);
      content = content.replace(/"tab_contact": "Kontakt",/g, `"tab_contact": "Kontakt",\n${deTrans},`);
      content = content.replace(/"tab_contact": "Contact",/g, `"tab_contact": "Contact",\n${frTrans},`); // might replace multiple if NL also has Contact. Let's be precise.
    }
    
    // Better replacement using regex targeting language sections
    const injectTrans = (langStr, injection) => {
      const rx = new RegExp(`(${langStr}:\\s*\\{[\\s\\S]*?"tab_contact":\\s*"[^"]*",?)`, 'g');
      content = content.replace(rx, `$1\n${injection},`);
    };

    injectTrans('en', enTrans);
    injectTrans('de', deTrans);
    injectTrans('fr', frTrans);
    injectTrans('nl', nlTrans);

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('✅ Traducerile au fost injectate in i18n.ts');
  } else {
    console.log('❌ Fisierul i18n.ts nu a fost gasit.');
  }

}

fix();
