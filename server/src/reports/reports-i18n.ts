// ---------------------------------------------------------------------------
// REPORT I18N
//
// Lightweight server-side localization for report catalogue entries and
// report payload labels (report name, description, KPI labels, table names,
// column headers, chart titles/series). The reports page ships an English
// catalogue from the server and a locale from the client; these helpers map
// the known English strings to the active TMS language so that previews,
// Excel and PDF exports all appear localized.
//
// Languages: ro, en, nl, de (the four TMS UI languages). English is the
// canonical source and falls through untouched.
// ---------------------------------------------------------------------------

import { ReportPayload } from './reports.catalog';

export type ReportLocale = 'ro' | 'en' | 'nl' | 'de';

const LOCALE_CODES: ReportLocale[] = ['ro', 'en', 'nl', 'de'];

export function normalizeLocale(locale?: string | null): ReportLocale {
  const l = (locale || '').toLowerCase();
  if (l.startsWith('ro')) return 'ro';
  if (l.startsWith('nl')) return 'nl';
  if (l.startsWith('de')) return 'de';
  return 'en';
}

export function isReportLocale(locale?: string | null): boolean {
  return LOCALE_CODES.includes(normalizeLocale(locale));
}

// Entries are kept in a row array (rather than a plain object literal) so the
// same source string can appear multiple times without tripping TypeScript's
// duplicate-property check; later rows win.
const ROWS: Array<[string, Partial<Record<ReportLocale, string>>]> = [
  // ---- Report names ---------------------------------------------------------
  ['Executive Overview', { ro: 'Rezumat executiv', nl: 'Directieoverzicht', de: 'Managementübersicht' }],
  ['Financial Position (P&L)', { ro: 'Poziție financiară (P&L)', nl: 'Financiële positie (P&L)', de: 'Finanzielle Lage (GuV)' }],
  ['Customer Profitability', { ro: 'Profitabilitate pe clienți', nl: 'Winstgevendheid per klant', de: 'Kundengewinnbarkeit' }],
  ['Route Profitability', { ro: 'Profitabilitate pe rute', nl: 'Winstgevendheid per route', de: 'Rentabilität nach Strecke' }],
  ['Fleet Performance', { ro: 'Performanța flotei', nl: 'Wagenparkprestaties', de: 'Flottenleistung' }],
  ['Driver Performance', { ro: 'Performanța șoferilor', nl: 'Prestaties van chauffeurs', de: 'Fahrerleistung' }],
  ['Customer Service Performance', { ro: 'Performanța serviciului clienți', nl: 'Klantenserviceprestaties', de: 'Kundenservice-Leistung' }],
  ['Carrier & Subcontractor Costs', { ro: 'Costuri transportatori și subcontractori', nl: 'Kosten vervoerders en onderaannemers', de: 'Kosten für Spediteure und Subunternehmer' }],
  ['Receivables Aging', { ro: 'Vechimea creanțelor', nl: 'Vervaltijd debiteuren', de: 'Forderungsaltersstruktur' }],
  ['Accounts Payable', { ro: 'Obligații de plată', nl: 'Crediteuren', de: 'Verbindlichkeiten' }],
  ['Exceptions Register', { ro: 'Registrul excepțiilor', nl: 'Register van uitzonderingen', de: 'Ausnahmeregister' }],
  ['Cash Flow Projection', { ro: 'Proiecția fluxului de numerar', nl: 'Prognose kasstromen', de: 'Cashflow-Prognose' }],
  ['KPI Methodology', { ro: 'Metodologia KPI', nl: 'KPI-methodologie', de: 'KPI-Methodik' }],
  // ---- Report descriptions --------------------------------------------------
  ['Operations, service and fleet performance snapshot over the period.', {
    ro: 'Situația operațiunilor, serviciilor și performanței flotei în perioada selectată.',
    nl: 'Overzicht van operaties, service en wagenparkprestaties over de periode.',
    de: 'Überblick über Betrieb, Service und Flottenleistung im Zeitraum.',
  }],
  ['Revenue, costs, profit and receivables/payables position.', {
    ro: 'Venituri, costuri, profit și poziția creanțelor/obligațiilor.',
    nl: 'Opbrengsten, kosten, winst en debiteuren/crediteurenpositie.',
    de: 'Umsatz, Kosten, Gewinn und Position der Forderungen/Verbindlichkeiten.',
  }],
  ['Revenue, cost, profit and OTIF per customer.', {
    ro: 'Venituri, costuri, profit și OTIF pe client.',
    nl: 'Opbrengsten, kosten, winst en OTIF per klant.',
    de: 'Umsatz, Kosten, Gewinn und OTIF je Kunde.',
  }],
  ['Profitability of each origin → destination lane.', {
    ro: 'Profitabilitatea fiecărei rute origine → destinație.',
    nl: 'Winstgevendheid van elke herkomst → bestemming.',
    de: 'Rentabilität jeder Relation Ursprung → Ziel.',
  }],
  ['Vehicle-level km, revenue, cost, profit and utilization.', {
    ro: 'Km, venituri, costuri, profit și utilizare la nivel de vehicul.',
    nl: 'Km, opbrengsten, kosten, winst en inzet per voertuig.',
    de: 'Km, Umsatz, Kosten, Gewinn und Auslastung je Fahrzeug.',
  }],
  ['Driver-level trips, km, revenue, cost, profit and on-time delivery.', {
    ro: 'Curse, km, venituri, costuri, profit și livrări la timp pe șofer.',
    nl: 'Ritten, km, opbrengsten, kosten, winst en op tijd leveren per chauffeur.',
    de: 'Fahrten, km, Umsatz, Kosten, Gewinn und pünktliche Lieferungen je Fahrer.',
  }],
  ['Per-customer delivery performance over the period: orders, on-time, late, cancelled and OTIF, with trend charts.', {
    ro: 'Performanța livrărilor pe client în perioadă: comenzi, la timp, întârziate, anulate și OTIF, cu grafice de tendință.',
    nl: 'Leveringsprestaties per klant over de periode: orders, op tijd, laat, geannuleerd en OTIF, met trendgrafieken.',
    de: 'Lieferleistung je Kunde im Zeitraum: Aufträge, pünktlich, verspätet, storniert und OTIF, mit Trenddiagrammen.',
  }],
  ['External carrier cost exposure and margin impact per carrier.', {
    ro: 'Costuri transportatori externi și impactul asupra marjei pe transportator.',
    nl: 'Externe vervoerderskosten en marge-impact per vervoerder.',
    de: 'Externe Speditionskosten und Marge-Einfluss je Spediteur.',
  }],
  ['Outstanding invoices bucketed by age and detailed open list.', {
    ro: 'Facturi neîncasate grupate pe vechime și listă detaliată deschisă.',
    nl: 'Openstaande facturen ingedeeld op leeftijd en gedetailleerde open lijst.',
    de: 'Offene Rechnungen nach Altersgruppen und detaillierte offene Liste.',
  }],
  ['Unpaid carrier and subcontractor costs plus outstanding settlements.', {
    ro: 'Costuri neplătite către transportatori și subcontractori plus decontări restante.',
    nl: 'Onbetaalde kosten van vervoerders en onderaannemers plus openstaande afrekeningen.',
    de: 'Unbezahlte Kosten für Spediteure und Subunternehmer sowie offene Abrechnungen.',
  }],
  ['Operational exceptions detected in the period (severity sorted).', {
    ro: 'Excepții operaționale detectate în perioadă (sortate pe severitate).',
    nl: 'Operationele uitzonderingen in de periode (gesorteerd op ernst).',
    de: 'Im Zeitraum erkannte Betriebsausnahmen (nach Schweregrad sortiert).',
  }],
  ['Actual and expected cash in/out and rolling 3-month projection.', {
    ro: 'Intrări/ieșiri de numerar efective și estimate și proiecție rulantă pe 3 luni.',
    nl: 'Werkelijke en verwachte kasinstromen/-uitstromen en doorlopende 3-maandenprognose.',
    de: 'Tatsächliche und erwartete Zu-/Abflüsse sowie rollierende 3-Monats-Prognose.',
  }],
  ['The definition and source of every dashboard KPI (support/reference document).', {
    ro: 'Definiția și sursa fiecărui KPI din tabloul de bord (document de referință).',
    nl: 'Definitie en bron van elke dashboard-KPI (referentiebewijs).',
    de: 'Definition und Quelle jeder Dashboard-KPI (Referenzdokument).',
  }],
  ['Definition and source of every dashboard KPI.', {
    ro: 'Definiția și sursa fiecărui KPI din tabloul de bord.',
    nl: 'Definitie en bron van elke dashboard-KPI.',
    de: 'Definition und Quelle jeder Dashboard-KPI.',
  }],
  // ---- KPI labels -----------------------------------------------------------
  ['Orders', { ro: 'Comenzi', nl: 'Orders', de: 'Aufträge' }],
  ['Open orders', { ro: 'Comenzi deschise', nl: 'Openstaande orders', de: 'Offene Aufträge' }],
  ['Active trips', { ro: 'Curse active', nl: 'Actieve ritten', de: 'Aktive Fahrten' }],
  ['Completed trips', { ro: 'Curse finalizate', nl: 'Voltooide ritten', de: 'Abgeschlossene Fahrten' }],
  ['Deliveries', { ro: 'Livrări', nl: 'Leveringen', de: 'Lieferungen' }],
  ['Late deliveries', { ro: 'Livrări întârziate', nl: 'Te late leveringen', de: 'Verspätete Lieferungen' }],
  ['Open exceptions', { ro: 'Excepții deschise', nl: 'Openstaande uitzonderingen', de: 'Offene Ausnahmen' }],
  ['Revenue', { ro: 'Venituri', nl: 'Opbrengsten', de: 'Umsatz' }],
  ['Gross profit', { ro: 'Profit brut', nl: 'Brutowinst', de: 'Bruttogewinn' }],
  ['Gross margin', { ro: 'Marjă brută', nl: 'Brutomarge', de: 'Bruttomarge' }],
  ['Fleet utilization', { ro: 'Utilizare flotă', nl: 'Inzet wagenpark', de: 'Flottenauslastung' }],
  ['Deadhead ratio', { ro: 'Raport alergare în gol', nl: 'Leegloopverhouding', de: 'Leerfahrtquote' }],
  ['Transport cost', { ro: 'Cost transport', nl: 'Transportkosten', de: 'Transportkosten' }],
  ['Operating expenses', { ro: 'Cheltuieli operaționale', nl: 'Operationele uitgaven', de: 'Betriebskosten' }],
  ['Total cost', { ro: 'Cost total', nl: 'Totale kosten', de: 'Gesamtkosten' }],
  ['Revenue / km', { ro: 'Venit / km', nl: 'Opbrengst / km', de: 'Umsatz / km' }],
  ['Cost / km', { ro: 'Cost / km', nl: 'Kosten / km', de: 'Kosten / km' }],
  ['Profit / km', { ro: 'Profit / km', nl: 'Winst / km', de: 'Gewinn / km' }],
  ['Accounts receivable', { ro: 'Creanțe', nl: 'Debiteuren', de: 'Forderungen' }],
  ['Overdue receivables', { ro: 'Creanțe restante', nl: 'Vervallen debiteuren', de: 'Überfällige Forderungen' }],
  ['Accounts payable', { ro: 'Obligații de plată', nl: 'Crediteuren', de: 'Verbindlichkeiten' }],
  ['Unbilled revenue', { ro: 'Venituri nefacturate', nl: 'Niet-gefactureerde opbrengsten', de: 'Nicht fakturierter Umsatz' }],
  ['Average payment days', { ro: 'Zile medii de plată', nl: 'Gemiddelde betaaldagen', de: 'Durchschnittliche Zahlungstage' }],
  ['Collection rate', { ro: 'Rată de încasare', nl: 'Incassograad', de: 'Einzugsquote' }],
  ['Customers', { ro: 'Clienți', nl: 'Klanten', de: 'Kunden' }],
  ['Attributed cost', { ro: 'Cost atribuit', nl: 'Toegerekende kosten', de: 'Zugerechnete Kosten' }],
  ['Profit', { ro: 'Profit', nl: 'Winst', de: 'Gewinn' }],
  ['Margin', { ro: 'Marjă', nl: 'Marge', de: 'Marge' }],
  ['Routes', { ro: 'Rute', nl: 'Routes', de: 'Routen' }],
  ['Most profitable lane', { ro: 'Cea mai profitabilă rută', nl: 'Meest winstgevende route', de: 'Gewinnbringendste Strecke' }],
  ['Loaded km', { ro: 'Km încărcați', nl: 'Beladen km', de: 'Beladene km' }],
  ['Empty km', { ro: 'Km în gol', nl: 'Lege km', de: 'Leer-km' }],
  ['Drivers', { ro: 'Șoferi', nl: 'Chauffeurs', de: 'Fahrer' }],
  ['Best driver by profit', { ro: 'Cel mai bun șofer după profit', nl: 'Beste chauffeur op winst', de: 'Bester Fahrer nach Gewinn' }],
  ['Total orders', { ro: 'Total comenzi', nl: 'Totaal orders', de: 'Gesamtaufträge' }],
  ['On-time deliveries', { ro: 'Livrări la timp', nl: 'Op tijd geleverd', de: 'Pünktliche Lieferungen' }],
  ['On-time rate', { ro: 'Rată la timp', nl: 'Op-tijd percentage', de: 'Pünktlichkeitsquote' }],
  ['Late rate', { ro: 'Rată întârzieri', nl: 'Te laat percentage', de: 'Verspätungsquote' }],
  ['Avg delay (min)', { ro: 'Întârziere medie (min)', nl: 'Gemiddelde vertraging (min)', de: 'Durchschnittliche Verspätung (Min.)' }],
  ['Cancelled', { ro: 'Anulate', nl: 'Geannuleerd', de: 'Storniert' }],
  ['Not delivered / pending', { ro: 'Nelivrate / în așteptare', nl: 'Niet geleverd / in afwachting', de: 'Nicht geliefert / offen' }],
  ['Carriers', { ro: 'Transportatori', nl: 'Vervoerders', de: 'Spediteure' }],
  ['Total carrier cost', { ro: 'Cost total transportatori', nl: 'Totale vervoerderskosten', de: 'Gesamtkosten Spediteure' }],
  ['Total outstanding', { ro: 'Total de încasat', nl: 'Totaal openstaand', de: 'Gesamt offen' }],
  ['Overdue', { ro: 'Restante', nl: 'Vervallen', de: 'Überfällig' }],
  ['Overdue invoices', { ro: 'Facturi restante', nl: 'Vervallen facturen', de: 'Überfällige Rechnungen' }],
  ['Total payable', { ro: 'Total de plătit', nl: 'Totaal te betalen', de: 'Gesamt zu zahlen' }],
  ['Carrier costs', { ro: 'Costuri transportatori', nl: 'Vervoerderskosten', de: 'Speditionskosten' }],
  ['Payable records', { ro: 'Înregistrări de plătit', nl: 'Te betalen posten', de: 'Zu zahlende Einträge' }],
  ['Exceptions', { ro: 'Excepții', nl: 'Uitzonderingen', de: 'Ausnahmen' }],
  ['High severity', { ro: 'Severitate ridicată', nl: 'Hoge ernst', de: 'Hohe Schwere' }],
  ['Opening balance', { ro: 'Sold inițial', nl: 'Beginsaldo', de: 'Anfangssaldo' }],
  ['Actual incoming', { ro: 'Încasări efective', nl: 'Werkelijke instroom', de: 'Tatsächliche Einnahmen' }],
  ['Actual outgoing', { ro: 'Plăți efective', nl: 'Werkelijke uitstroom', de: 'Tatsächliche Ausgaben' }],
  ['Projected closing', { ro: 'Sold proiectat', nl: 'Geprojecteerd eindsaldo', de: 'Projizierter Endbestand' }],
  // ---- Table names ----------------------------------------------------------
  ['Order status', { ro: 'Status comenzi', nl: 'Orderstatus', de: 'Auftragsstatus' }],
  ['Trip status', { ro: 'Status curse', nl: 'Ritstatus', de: 'Fahrtenstatus' }],
  ['Top customers by revenue', { ro: 'Top clienți după venituri', nl: 'Top klanten op opbrengsten', de: 'Top-Kunden nach Umsatz' }],
  ['Routes by profitability', { ro: 'Rute după profitabilitate', nl: 'Routes op winstgevendheid', de: 'Routen nach Rentabilität' }],
  ['Cost breakdown', { ro: 'Defalcare costuri', nl: 'Kostenspecificatie', de: 'Kostenaufschlüsselung' }],
  ['Receivables aging', { ro: 'Vechimea creanțelor', nl: 'Vervaltijd debiteuren', de: 'Forderungsaltersstruktur' }],
  ['Payables', { ro: 'Obligații de plată', nl: 'Crediteuren', de: 'Verbindlichkeiten' }],
  ['Monthly breakdown', { ro: 'Defalcare lunară', nl: 'Maandelijkse uitsplitsing', de: 'Monatliche Aufschlüsselung' }],
  ['Fleet', { ro: 'Flotă', nl: 'Wagenpark', de: 'Flotte' }],
  ['Aging buckets', { ro: 'Grupuri de vechime', nl: 'Vervaltijdgroepen', de: 'Altersgruppen' }],
  ['Open invoices', { ro: 'Facturi deschise', nl: 'Openstaande facturen', de: 'Offene Rechnungen' }],
  ['Projection', { ro: 'Proiecție', nl: 'Prognose', de: 'Prognose' }],
  ['Cash flows', { ro: 'Fluxuri de numerar', nl: 'Kasstromen', de: 'Cashflows' }],
  ['Definitions', { ro: 'Definiții', nl: 'Definities', de: 'Definitionen' }],
  // ---- Column headers -------------------------------------------------------
  ['Status', { ro: 'Status', nl: 'Status', de: 'Status' }],
  ['Trips', { ro: 'Curse', nl: 'Ritten', de: 'Fahrten' }],
  ['Customer', { ro: 'Client', nl: 'Klant', de: 'Kunde' }],
  ['Route', { ro: 'Rută', nl: 'Route', de: 'Route' }],
  ['Cost', { ro: 'Cost', nl: 'Kosten', de: 'Kosten' }],
  ['Category', { ro: 'Categorie', nl: 'Categorie', de: 'Kategorie' }],
  ['Amount', { ro: 'Sumă', nl: 'Bedrag', de: 'Betrag' }],
  ['Share', { ro: 'Cotă', nl: 'Aandeel', de: 'Anteil' }],
  ['Bucket', { ro: 'Grup', nl: 'Groep', de: 'Gruppe' }],
  ['Invoices', { ro: 'Facturi', nl: 'Facturen', de: 'Rechnungen' }],
  ['Outstanding', { ro: 'Neîncasat', nl: 'Openstaand', de: 'Offen' }],
  ['Payable', { ro: 'De plătit', nl: 'Te betalen', de: 'Zahlbar' }],
  ['Date', { ro: 'Dată', nl: 'Datum', de: 'Datum' }],
  ['Truck', { ro: 'Camion', nl: 'Vrachtwagen', de: 'LKW' }],
  ['On-time', { ro: 'La timp', nl: 'Op tijd', de: 'Pünktlich' }],
  ['Delivery %', { ro: 'Livrat %', nl: 'Levering %', de: 'Lieferung %' }],
  ['Late', { ro: 'Întârziate', nl: 'Te laat', de: 'Verspätet' }],
  ['Late %', { ro: 'Întârziat %', nl: 'Te laat %', de: 'Verspätet %' }],
  ['Avg late (min)', { ro: 'Întârziere medie (min)', nl: 'Gem. vertraging (min)', de: 'Durchschn. Verspätung (Min.)' }],
  ['Not delivered', { ro: 'Nelivrate', nl: 'Niet geleverd', de: 'Nicht geliefert' }],
  ['Period', { ro: 'Perioadă', nl: 'Periode', de: 'Zeitraum' }],
  ['Driver', { ro: 'Șofer', nl: 'Chauffeur', de: 'Fahrer' }],
  ['Carrier', { ro: 'Transportator', nl: 'Vervoerder', de: 'Spediteur' }],
  ['Carrier cost', { ro: 'Cost transportator', nl: 'Vervoerderskosten', de: 'Speditionskosten' }],
  ['Margin impact', { ro: 'Impact marjă', nl: 'Marge-impact', de: 'Marge-Einfluss' }],
  ['Invoice', { ro: 'Factură', nl: 'Factuur', de: 'Rechnung' }],
  ['Client', { ro: 'Client', nl: 'Klant', de: 'Kunde' }],
  ['Issued', { ro: 'Emisă', nl: 'Gefactureerd', de: 'Ausgestellt' }],
  ['Due', { ro: 'Scadență', nl: 'Vervaldatum', de: 'Fällig' }],
  ['Paid', { ro: 'Plătit', nl: 'Betaald', de: 'Bezahlt' }],
  ['Days overdue', { ro: 'Zile restante', nl: 'Dagen vervallen', de: 'Tage überfällig' }],
  ['Severity', { ro: 'Severitate', nl: 'Ernst', de: 'Schweregrad' }],
  ['Time', { ro: 'Ora', nl: 'Tijd', de: 'Zeit' }],
  ['Type', { ro: 'Tip', nl: 'Type', de: 'Typ' }],
  ['Order', { ro: 'Comandă', nl: 'Order', de: 'Auftrag' }],
  ['Message', { ro: 'Mesaj', nl: 'Bericht', de: 'Nachricht' }],
  ['Month', { ro: 'Lună', nl: 'Maand', de: 'Monat' }],
  ['Expected in', { ro: 'Încasări estimate', nl: 'Verwachte instroom', de: 'Erwartete Einnahmen' }],
  ['Expected out', { ro: 'Plăți estimate', nl: 'Verwachte uitstroom', de: 'Erwartete Ausgaben' }],
  ['Balance', { ro: 'Sold', nl: 'Saldo', de: 'Saldo' }],
  ['Item', { ro: 'Element', nl: 'Post', de: 'Position' }],
  ['Key', { ro: 'Cheie', nl: 'Sleutel', de: 'Schlüssel' }],
  ['Name', { ro: 'Nume', nl: 'Naam', de: 'Name' }],
  ['Section', { ro: 'Secțiune', nl: 'Sectie', de: 'Abschnitt' }],
  ['Unit', { ro: 'Unitate', nl: 'Eenheid', de: 'Einheit' }],
  ['Definition', { ro: 'Definiție', nl: 'Definitie', de: 'Definition' }],
  ['Source', { ro: 'Sursă', nl: 'Bron', de: 'Quelle' }],
  ['Formula', { ro: 'Formulă', nl: 'Formule', de: 'Formel' }],
  // ---- Chart titles ---------------------------------------------------------
  ['Order Status Distribution', { ro: 'Distribuția statusurilor comenzilor', nl: 'Verdeling orderstatussen', de: 'Verteilung der Auftragsstatus' }],
  ['Financial Trend', { ro: 'Tendință financiară', nl: 'Financiële trend', de: 'Finanzieller Trend' }],
  ['Orders vs Delivered vs On-time (trend)', { ro: 'Comenzi vs Livrate vs La timp (tendință)', nl: 'Orders vs Geleverd vs Op tijd (trend)', de: 'Aufträge vs. Geliefert vs. Pünktlich (Trend)' }],
  ['On-time delivery rate by customer (%)', { ro: 'Rată de livrare la timp pe client (%)', nl: 'Op-tijd leveringspercentage per klant (%)', de: 'Pünktliche Lieferquote je Kunde (%)' }],
  // ---- Chart series ---------------------------------------------------------
  ['Delivered', { ro: 'Livrate', nl: 'Geleverd', de: 'Geliefert' }],
  ['On-time %', { ro: 'La timp %', nl: 'Op tijd %', de: 'Pünktlich %' }],
  // ---- Document chrome (PDF / Excel) ---------------------------------------
  ['Key figures', { ro: 'Indicatori-cheie', nl: 'Kerncijfers', de: 'Kennzahlen' }],
  ['Generated', { ro: 'Generat', nl: 'Gegenereerd', de: 'Generiert' }],
  ['Charts', { ro: 'Grafice', nl: 'Grafieken', de: 'Diagramme' }],
  ['Total', { ro: 'Total', nl: 'Totaal', de: 'Gesamt' }],
  ['KPI', { ro: 'KPI', nl: 'KPI', de: 'KPI' }],
  ['Value', { ro: 'Valoare', nl: 'Waarde', de: 'Wert' }],
  ['Trend', { ro: 'Tendință', nl: 'Trend', de: 'Trend' }],
];

const DICT: Record<string, Partial<Record<ReportLocale, string>>> = {};
for (const [key, val] of ROWS) DICT[key] = val;

const UNIT_ROWS: Array<[string, Record<ReportLocale, string>]> = [
  ['EUR', { ro: '€', nl: '€', de: '€', en: '€' }],
  ['EUR/km', { ro: '€/km', nl: '€/km', de: '€/km', en: '€/km' }],
  ['EUR/month', { ro: '€/lună', nl: '€/maand', de: '€/Monat', en: '€/month' }],
  ['EUR/order', { ro: '€/comandă', nl: '€/order', de: '€/Auftrag', en: '€/order' }],
  ['EUR/trip', { ro: '€/cursă', nl: '€/rit', de: '€/Fahrt', en: '€/trip' }],
];

const UNIT_DICT: Record<string, Record<ReportLocale, string>> = {};
for (const [key, val] of UNIT_ROWS) UNIT_DICT[key] = val;

export function localizeText(text: string, locale?: string | null): string {
  const loc = normalizeLocale(locale);
  const entry = DICT[text];
  if (entry && entry[loc]) return entry[loc];
  return text;
}

export function localizeUnit(unit: string, locale?: string | null): string {
  const loc = normalizeLocale(locale);
  const entry = UNIT_DICT[unit];
  if (entry && entry[loc]) return entry[loc];
  return unit;
}

export function localizePayload(p: ReportPayload, locale?: string | null): ReportPayload {
  const loc = normalizeLocale(locale);

  const t = (s: any): string => localizeText(String(s ?? ''), loc);

  p.reportName = t(p.reportName);
  p.description = t(p.description || '');
  for (const k of p.kpis || []) {
    if (k) {
      k.label = t(k.label);
      k.unit = localizeUnit(k.unit, loc) as ReportPayload['kpis'][number]['unit'];
    }
  }
  for (const tab of p.tables || []) {
    if (!tab) continue;
    tab.name = t(tab.name || '');
    for (const c of tab.columns || []) {
      if (c) c.header = t(c.header || '');
    }
    // Localize data values of "unit" columns (e.g. KPI methodology table).
    const unitCol = (tab.columns || []).findIndex((c) => c.key === 'unit');
    if (unitCol >= 0) {
      for (const row of tab.rows || []) {
        if (row && row.unit) row.unit = localizeUnit(String(row.unit), loc);
      }
    }
  }
  for (const chart of p.charts || []) {
    if (!chart) continue;
    chart.title = t(chart.title || '');
    for (const s of chart.series || []) {
      if (s) s.name = t(s.name || '');
    }
  }
  return p;
}