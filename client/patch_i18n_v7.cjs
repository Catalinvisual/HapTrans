const fs = require('fs');
const path = require('path');

const i18nPath = path.join(__dirname, 'src', 'lib', 'i18n.ts');
let content = fs.readFileSync(i18nPath, 'utf8');

const newKeys = {
  ro: `
      general: "General",
      stops: "Opriri",
      cargo: "Marfă",
      customerReference: "Referință Client",
      internalReference: "Referință Internă",
      transportType: "Tip Transport",
      priority: "Prioritate",
      currency: "Monedă",
      plannerView: "Planificator (Drag&Drop)",
      orderRef: "Comanda",
      unassignedOrders: "Comenzi Nealocate",
`,
  en: `
      general: "General",
      stops: "Stops",
      cargo: "Cargo",
      customerReference: "Customer Reference",
      internalReference: "Internal Reference",
      transportType: "Transport Type",
      priority: "Priority",
      currency: "Currency",
      plannerView: "Planner (Drag&Drop)",
      orderRef: "Order",
      unassignedOrders: "Unassigned Orders",
`,
  fr: `
      general: "Général",
      stops: "Arrêts",
      cargo: "Cargaison",
      customerReference: "Référence Client",
      internalReference: "Référence Interne",
      transportType: "Type de Transport",
      priority: "Priorité",
      currency: "Devise",
      plannerView: "Planificateur (Glisser-Déposer)",
      orderRef: "Commande",
      unassignedOrders: "Commandes Non Assignées",
`,
  de: `
      general: "Allgemein",
      stops: "Stopps",
      cargo: "Fracht",
      customerReference: "Kundenreferenz",
      internalReference: "Interne Referenz",
      transportType: "Transportart",
      priority: "Priorität",
      currency: "Währung",
      plannerView: "Planer (Drag&Drop)",
      orderRef: "Bestellung",
      unassignedOrders: "Nicht zugewiesene Bestellungen",
`,
  it: `
      general: "Generale",
      stops: "Fermate",
      cargo: "Carico",
      customerReference: "Riferimento Cliente",
      internalReference: "Riferimento Interno",
      transportType: "Tipo di Trasporto",
      priority: "Priorità",
      currency: "Valuta",
      plannerView: "Pianificatore (Drag&Drop)",
      orderRef: "Ordine",
      unassignedOrders: "Ordini Non Assegnati",
`,
  es: `
      general: "General",
      stops: "Paradas",
      cargo: "Carga",
      customerReference: "Referencia del Cliente",
      internalReference: "Referencia Interna",
      transportType: "Tipo de Transporte",
      priority: "Prioridad",
      currency: "Moneda",
      plannerView: "Planificador (Drag&Drop)",
      orderRef: "Pedido",
      unassignedOrders: "Pedidos No Asignados",
`,
  nl: `
      general: "Algemeen",
      stops: "Stops",
      cargo: "Vracht",
      customerReference: "Klantreferentie",
      internalReference: "Interne Referentie",
      transportType: "Transporttype",
      priority: "Prioriteit",
      currency: "Valuta",
      plannerView: "Planner (Drag&Drop)",
      orderRef: "Bestelling",
      unassignedOrders: "Niet-toegewezen Bestellingen",
`
};

newKeys['frBase'] = newKeys['fr'];

for (const lang in newKeys) {
  const regex = new RegExp(lang + ': \\{ translation: \\{');
  if (content.match(regex)) {
    content = content.replace(regex, lang + ': { translation: {' + newKeys[lang]);
    console.log('Patched ' + lang);
  } else {
    console.log('Could not find ' + lang);
  }
}

fs.writeFileSync(i18nPath, content, 'utf8');
console.log('Done!');
