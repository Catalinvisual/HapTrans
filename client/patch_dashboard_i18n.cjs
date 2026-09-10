const fs = require('fs');
const path = require('path');

const i18nPath = path.join(__dirname, 'src', 'lib', 'i18n.ts');
let content = fs.readFileSync(i18nPath, 'utf8');

const newKeys = {
  ro: `
      euDieselPrices: "Prețuri Diesel EU",
      fuelCostCalculator: "Calculator cost combustibil (consum 32L/100km)",
      profit: "Profit",
      revenue: "Venituri",
      activeTrips: "Curse active",
      activeTrucks: "Camioane active",
      costPerKm: "Cost/km mediu",
      totalTrips: "Total curse",
      costs: "Costuri",
      expiringDocuments: "Documente expirate",
      profitByMonth: "Profit pe luni",
      revenueVsCosts: "Venituri vs Costuri pe luni",
      topProfitableRoutes: "Top Rute Profitabile",
      topClientsProfit: "Top Clienți (Profit)",
      notEnoughData: "Nu există date suficiente",
      allClearNoAlerts: "Totul în regulă! Nicio alertă activă.",
`,
  en: `
      euDieselPrices: "EU Diesel Prices",
      fuelCostCalculator: "Fuel cost calculator (consumption 32L/100km)",
      profit: "Profit",
      revenue: "Revenue",
      activeTrips: "Active trips",
      activeTrucks: "Active trucks",
      costPerKm: "Average cost/km",
      totalTrips: "Total trips",
      costs: "Costs",
      expiringDocuments: "Expired documents",
      profitByMonth: "Profit by month",
      revenueVsCosts: "Revenue vs Costs by month",
      topProfitableRoutes: "Top Profitable Routes",
      topClientsProfit: "Top Clients (Profit)",
      notEnoughData: "Not enough data",
      allClearNoAlerts: "Everything fine! No active alerts.",
`,
  nl: `
      euDieselPrices: "EU Dieselprijzen",
      fuelCostCalculator: "Brandstofkostencalculator (verbruik 32L/100km)",
      profit: "Winst",
      revenue: "Inkomsten",
      activeTrips: "Actieve ritten",
      activeTrucks: "Actieve vrachtwagens",
      costPerKm: "Gemiddelde kosten/km",
      totalTrips: "Totaal ritten",
      costs: "Kosten",
      expiringDocuments: "Verlopen documenten",
      profitByMonth: "Winst per maand",
      revenueVsCosts: "Inkomsten vs Kosten per maand",
      topProfitableRoutes: "Top Winstgevende Routes",
      topClientsProfit: "Top Klanten (Winst)",
      notEnoughData: "Niet genoeg gegevens",
      allClearNoAlerts: "Alles in orde! Geen actieve meldingen.",
`,
  de: `
      euDieselPrices: "EU Dieselpreise",
      fuelCostCalculator: "Kraftstoffkostenrechner (Verbrauch 32L/100km)",
      profit: "Gewinn",
      revenue: "Einnahmen",
      activeTrips: "Aktive Fahrten",
      activeTrucks: "Aktive Lastwagen",
      costPerKm: "Durchschnittliche Kosten/km",
      totalTrips: "Gesamte Fahrten",
      costs: "Kosten",
      expiringDocuments: "Abgelaufene Dokumente",
      profitByMonth: "Gewinn pro Monat",
      revenueVsCosts: "Einnahmen vs Kosten pro Monat",
      topProfitableRoutes: "Top Profitable Routen",
      topClientsProfit: "Top Kunden (Gewinn)",
      notEnoughData: "Nicht genügend Daten",
      allClearNoAlerts: "Alles in Ordnung! Keine aktiven Benachrichtigungen.",
`,
  fr: `
      euDieselPrices: "Prix du Diesel UE",
      fuelCostCalculator: "Calculateur de coût de carburant (consommation 32L/100km)",
      profit: "Bénéfice",
      revenue: "Revenus",
      activeTrips: "Trajets actifs",
      activeTrucks: "Camions actifs",
      costPerKm: "Coût moyen/km",
      totalTrips: "Total trajets",
      costs: "Coûts",
      expiringDocuments: "Documents expirés",
      profitByMonth: "Bénéfice par mois",
      revenueVsCosts: "Revenus vs Coûts par mois",
      topProfitableRoutes: "Top Itinéraires Rentables",
      topClientsProfit: "Top Clients (Bénéfice)",
      notEnoughData: "Pas assez de données",
      allClearNoAlerts: "Tout va bien ! Aucune alerte active.",
`,
  es: `
      euDieselPrices: "Precios de Diésel UE",
      fuelCostCalculator: "Calculadora de costo de combustible (consumo 32L/100km)",
      profit: "Beneficio",
      revenue: "Ingresos",
      activeTrips: "Viajes activos",
      activeTrucks: "Camiones activos",
      costPerKm: "Costo medio/km",
      totalTrips: "Total de viajes",
      costs: "Costos",
      expiringDocuments: "Documentos caducados",
      profitByMonth: "Beneficio por mes",
      revenueVsCosts: "Ingresos vs Costos por mes",
      topProfitableRoutes: "Top Rutas Rentables",
      topClientsProfit: "Top Clientes (Beneficio)",
      notEnoughData: "No hay suficientes datos",
      allClearNoAlerts: "¡Todo en orden! No hay alertas activas.",
`,
  it: `
      euDieselPrices: "Prezzi del Diesel UE",
      fuelCostCalculator: "Calcolatore costo carburante (consumo 32L/100km)",
      profit: "Profitto",
      revenue: "Entrate",
      activeTrips: "Viaggi attivi",
      activeTrucks: "Camion attivi",
      costPerKm: "Costo medio/km",
      totalTrips: "Viaggi totali",
      costs: "Costi",
      expiringDocuments: "Documenti scaduti",
      profitByMonth: "Profitto per mese",
      revenueVsCosts: "Entrate vs Costi per mese",
      topProfitableRoutes: "Migliori Rotte Redditizie",
      topClientsProfit: "Migliori Clienti (Profitto)",
      notEnoughData: "Dati insufficienti",
      allClearNoAlerts: "Tutto a posto! Nessun avviso attivo.",
`
};

newKeys['frBase'] = newKeys['fr'];

for (const lang in newKeys) {
  const regex = new RegExp(lang + ':\\s*\\{\\s*translation:\\s*\\{');
  if (content.match(regex)) {
    content = content.replace(regex, lang + ': { translation: {' + newKeys[lang]);
    console.log('Patched ' + lang);
  } else {
    console.log('Could not find ' + lang);
  }
}

fs.writeFileSync(i18nPath, content, 'utf8');
console.log('Done!');
