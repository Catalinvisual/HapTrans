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
// Languages: ro, en, nl, fr, de, es, pl (the seven TMS UI languages). English is the
// canonical source and falls through untouched.
// ---------------------------------------------------------------------------

import { ReportPayload } from './reports.catalog';

export type ReportLocale = 'ro' | 'en' | 'nl' | 'fr' | 'de' | 'es' | 'pl';

const LOCALE_CODES: ReportLocale[] = ['ro', 'en', 'nl', 'fr', 'de', 'es', 'pl'];

export function normalizeLocale(locale?: string | null): ReportLocale {
  const l = (locale || '').toLowerCase();
  if (l.startsWith('ro')) return 'ro';
  if (l.startsWith('nl')) return 'nl';
  if (l.startsWith('fr')) return 'fr';
  if (l.startsWith('de')) return 'de';
  if (l.startsWith('es')) return 'es';
  if (l.startsWith('pl')) return 'pl';
  return 'en';
}

export function isReportLocale(locale?: string | null): boolean {
  return LOCALE_CODES.includes(normalizeLocale(locale));
}

// Entries are kept in a row array (rather than a plain object literal) so the
// same source string can appear multiple times without tripping TypeScript's
// duplicate-property check; later rows win.
export const ROWS: Array<[string, Partial<Record<ReportLocale, string>>]> = [
  // ---- Report names ---------------------------------------------------------
  ['Executive Overview', { ro: 'Rezumat executiv', nl: 'Directieoverzicht', de: 'Managementübersicht' , es: 'Resumen ejecutivo', pl: 'Podsumowanie wykonawcze' }],
  ['Financial Position (P&L)', { ro: 'Poziție financiară (P&L)', nl: 'Financiële positie (P&L)', de: 'Finanzielle Lage (GuV)' , es: 'Posición financiera (P&L)', pl: 'Sytuacja finansowa (P&L)' }],
  ['Customer Profitability', { ro: 'Profitabilitate pe clienți', nl: 'Winstgevendheid per klant', de: 'Kundengewinnbarkeit' , es: 'Rentabilidad por cliente', pl: 'Rentowność klientów' }],
  ['Route Profitability', { ro: 'Profitabilitate pe rute', nl: 'Winstgevendheid per route', de: 'Rentabilität nach Strecke' , es: 'Rentabilidad por ruta', pl: 'Rentowność tras' }],
  ['Fleet Performance', { ro: 'Performanța flotei', nl: 'Wagenparkprestaties', de: 'Flottenleistung' , es: 'Rendimiento de la flota', pl: 'Wydajność floty' }],
  ['Driver Performance', { ro: 'Performanța șoferilor', nl: 'Prestaties van chauffeurs', de: 'Fahrerleistung' , es: 'Rendimiento de los conductores', pl: 'Wydajność kierowców' }],
  ['Customer Service Performance', { ro: 'Performanța serviciului clienți', nl: 'Klantenserviceprestaties', de: 'Kundenservice-Leistung' , es: 'Rendimiento del servicio al cliente', pl: 'Wydajność obsługi klienta' }],
  ['Carrier & Subcontractor Costs', { ro: 'Costuri transportatori și subcontractori', nl: 'Kosten vervoerders en onderaannemers', de: 'Kosten für Spediteure und Subunternehmer' , es: 'Costes de transportistas y subcontratistas', pl: 'Koszty przewoźników i podwykonawców' }],
  ['Receivables Aging', { ro: 'Vechimea creanțelor', nl: 'Vervaltijd debiteuren', de: 'Forderungsaltersstruktur' , es: 'Antigüedad de las cuentas por cobrar', pl: 'Struktura wiekowa należności' }],
  ['Accounts Payable', { ro: 'Obligații de plată', nl: 'Crediteuren', de: 'Verbindlichkeiten' , es: 'Cuentas por pagar', pl: 'Zobowiązania' }],
  ['Exceptions Register', { ro: 'Registrul excepțiilor', nl: 'Register van uitzonderingen', de: 'Ausnahmeregister' , es: 'Registro de excepciones', pl: 'Rejestr wyjątków' }],
  ['Cash Flow Projection', { ro: 'Proiecția fluxului de numerar', nl: 'Prognose kasstromen', de: 'Cashflow-Prognose' , es: 'Proyección del flujo de caja', pl: 'Prognoza przepływów pieniężnych' }],
  ['KPI Methodology', { ro: 'Metodologia KPI', nl: 'KPI-methodologie', de: 'KPI-Methodik' , es: 'Metodología de KPI', pl: 'Metodyka KPI' }],
  // ---- Report descriptions --------------------------------------------------
  ['Operations, service and fleet performance snapshot over the period.', {
    ro: 'Situația operațiunilor, serviciilor și performanței flotei în perioada selectată.',
    nl: 'Overzicht van operaties, service en wagenparkprestaties over de periode.',
    de: 'Überblick über Betrieb, Service und Flottenleistung im Zeitraum.',
   es: 'Resumen del rendimiento de las operaciones, el servicio y la flota durante el período.', pl: 'Przegląd wydajności operacyjnej, serwisowej i floty w danym okresie.' }],
  ['Revenue, costs, profit and receivables/payables position.', {
    ro: 'Venituri, costuri, profit și poziția creanțelor/obligațiilor.',
    nl: 'Opbrengsten, kosten, winst en debiteuren/crediteurenpositie.',
    de: 'Umsatz, Kosten, Gewinn und Position der Forderungen/Verbindlichkeiten.',
   es: 'Ingresos, costes, beneficio y posición de cuentas por cobrar/pagar.', pl: 'Przychody, koszty, zysk oraz pozycja należności/zobowiązań.' }],
  ['Revenue, cost, profit and OTIF per customer.', {
    ro: 'Venituri, costuri, profit și OTIF pe client.',
    nl: 'Opbrengsten, kosten, winst en OTIF per klant.',
    de: 'Umsatz, Kosten, Gewinn und OTIF je Kunde.',
   es: 'Ingresos, costes, beneficio y OTIF por cliente.', pl: 'Przychody, koszty, zysk i OTIF wg klienta.' }],
  ['Profitability of each origin → destination lane.', {
    ro: 'Profitabilitatea fiecărei rute origine → destinație.',
    nl: 'Winstgevendheid van elke herkomst → bestemming.',
    de: 'Rentabilität jeder Relation Ursprung → Ziel.',
   es: 'Rentabilidad de cada ruta origen → destino.', pl: 'Rentowność każdej trasy pochodzenie → cel.' }],
  ['Vehicle-level km, revenue, cost, profit and utilization.', {
    ro: 'Km, venituri, costuri, profit și utilizare la nivel de vehicul.',
    nl: 'Km, opbrengsten, kosten, winst en inzet per voertuig.',
    de: 'Km, Umsatz, Kosten, Gewinn und Auslastung je Fahrzeug.',
   es: 'Km, ingresos, costes, beneficio y utilización a nivel de vehículo.', pl: 'Kms, przychody, koszty, zysk i wykorzystanie na poziomie pojazdu.' }],
  ['Driver-level trips, km, revenue, cost, profit and on-time delivery.', {
    ro: 'Curse, km, venituri, costuri, profit și livrări la timp pe șofer.',
    nl: 'Ritten, km, opbrengsten, kosten, winst en op tijd leveren per chauffeur.',
    de: 'Fahrten, km, Umsatz, Kosten, Gewinn und pünktliche Lieferungen je Fahrer.',
   es: 'Viajes, km, ingresos, costes, beneficio y entregas a tiempo por conductor.', pl: 'Przejazdy, kms, przychody, koszty, zysk i terminowe dostawy wg kierowcy.' }],
  ['Per-customer delivery performance over the period: orders, on-time, late, cancelled and OTIF, with trend charts.', {
    ro: 'Performanța livrărilor pe client în perioadă: comenzi, la timp, întârziate, anulate și OTIF, cu grafice de tendință.',
    nl: 'Leveringsprestaties per klant over de periode: orders, op tijd, laat, geannuleerd en OTIF, met trendgrafieken.',
    de: 'Lieferleistung je Kunde im Zeitraum: Aufträge, pünktlich, verspätet, storniert und OTIF, mit Trenddiagrammen.',
   es: 'Rendimiento de entregas por cliente durante el período: pedidos, a tiempo, retrasados, cancelados y OTIF, con gráficos de tendencia.', pl: 'Wydajność dostaw wg klienta w danym okresie: zamówienia, terminowe, opóźnione, anulowane i OTIF, z wykresami trendów.' }],
  ['External carrier cost exposure and margin impact per carrier.', {
    ro: 'Costuri transportatori externi și impactul asupra marjei pe transportator.',
    nl: 'Externe vervoerderskosten en marge-impact per vervoerder.',
    de: 'Externe Speditionskosten und Marge-Einfluss je Spediteur.',
   es: 'Exposición al coste de transportistas externos e impacto en el margen por transportista.', pl: 'Ekspozycja na koszty zewnętrznych przewoźników i wpływ na marżę wg przewoźnika.' }],
  ['Outstanding invoices bucketed by age and detailed open list.', {
    ro: 'Facturi neîncasate grupate pe vechime și listă detaliată deschisă.',
    nl: 'Openstaande facturen ingedeeld op leeftijd en gedetailleerde open lijst.',
    de: 'Offene Rechnungen nach Altersgruppen und detaillierte offene Liste.',
   es: 'Facturas pendientes clasificadas por antigüedad y lista detallada de abiertas.', pl: 'Niezapłacone faktury pogrupowane wg wieku oraz szczegółowa lista otwartych.' }],
  ['Unpaid carrier and subcontractor costs plus outstanding settlements.', {
    ro: 'Costuri neplătite către transportatori și subcontractori plus decontări restante.',
    nl: 'Onbetaalde kosten van vervoerders en onderaannemers plus openstaande afrekeningen.',
    de: 'Unbezahlte Kosten für Spediteure und Subunternehmer sowie offene Abrechnungen.',
   es: 'Costes impagados de transportistas y subcontratistas más liquidaciones pendientes.', pl: 'Nieopłacone koszty przewoźników i podwykonawców oraz nierozliczone rozliczenia.' }],
  ['Operational exceptions detected in the period (severity sorted).', {
    ro: 'Excepții operaționale detectate în perioadă (sortate pe severitate).',
    nl: 'Operationele uitzonderingen in de periode (gesorteerd op ernst).',
    de: 'Im Zeitraum erkannte Betriebsausnahmen (nach Schweregrad sortiert).',
   es: 'Excepciones operativas detectadas en el período (clasificadas por severidad).', pl: 'Wyjątki operacyjne wykryte w danym okresie (sortowane wg ważności).' }],
  ['Actual and expected cash in/out and rolling 3-month projection.', {
    ro: 'Intrări/ieșiri de numerar efective și estimate și proiecție rulantă pe 3 luni.',
    nl: 'Werkelijke en verwachte kasinstromen/-uitstromen en doorlopende 3-maandenprognose.',
    de: 'Tatsächliche und erwartete Zu-/Abflüsse sowie rollierende 3-Monats-Prognose.',
   es: 'Entradas/salidas de efectivo reales y previstas y proyección móvil de 3 meses.', pl: 'Rzeczywiste i prognozowane wpływy/wypływy środków oraz krocząca prognoza na 3 miesiące.' }],
  ['The definition and source of every dashboard KPI (support/reference document).', {
    ro: 'Definiția și sursa fiecărui KPI din tabloul de bord (document de referință).',
    nl: 'Definitie en bron van elke dashboard-KPI (referentiebewijs).',
    de: 'Definition und Quelle jeder Dashboard-KPI (Referenzdokument).',
   es: 'La definición y la fuente de cada KPI del cuadro de mando (documento de apoyo/referencia).', pl: 'Definicja i źródło każdego KPI pulpitu nawigacyjnego (dokument pomocniczy/referencyjny).' }],
  ['Definition and source of every dashboard KPI.', {
    ro: 'Definiția și sursa fiecărui KPI din tabloul de bord.',
    nl: 'Definitie en bron van elke dashboard-KPI.',
    de: 'Definition und Quelle jeder Dashboard-KPI.',
   es: 'Definición y fuente de cada KPI del cuadro de mando.', pl: 'Definicja i źródło każdego KPI pulpitu nawigacyjnego.' }],
  // ---- KPI labels -----------------------------------------------------------
  ['Orders', { ro: 'Comenzi', nl: 'Orders', de: 'Aufträge' , es: 'Pedidos', pl: 'Zamówienia' }],
  ['Open orders', { ro: 'Comenzi deschise', nl: 'Openstaande orders', de: 'Offene Aufträge' , es: 'Pedidos abiertos', pl: 'Otwarte zamówienia' }],
  ['Active trips', { ro: 'Curse active', nl: 'Actieve ritten', de: 'Aktive Fahrten' , es: 'Viajes activos', pl: 'Aktywne przejazdy' }],
  ['Completed trips', { ro: 'Curse finalizate', nl: 'Voltooide ritten', de: 'Abgeschlossene Fahrten' , es: 'Viajes completados', pl: 'Ukończone przejazdy' }],
  ['Deliveries', { ro: 'Livrări', nl: 'Leveringen', de: 'Lieferungen' , es: 'Entregas', pl: 'Dostawy' }],
  ['Late deliveries', { ro: 'Livrări întârziate', nl: 'Te late leveringen', de: 'Verspätete Lieferungen' , es: 'Entregas retrasadas', pl: 'Opóźnione dostawy' }],
  ['Open exceptions', { ro: 'Excepții deschise', nl: 'Openstaande uitzonderingen', de: 'Offene Ausnahmen' , es: 'Excepciones abiertas', pl: 'Otwarte wyjątki' }],
  ['Revenue', { ro: 'Venituri', nl: 'Opbrengsten', de: 'Umsatz' , es: 'Ingresos', pl: 'Przychody' }],
  ['Gross profit', { ro: 'Profit brut', nl: 'Brutowinst', de: 'Bruttogewinn' , es: 'Beneficio bruto', pl: 'Zysk brutto' }],
  ['Gross margin', { ro: 'Marjă brută', nl: 'Brutomarge', de: 'Bruttomarge' , es: 'Margen bruto', pl: 'Marża brutto' }],
  ['Fleet utilization', { ro: 'Utilizare flotă', nl: 'Inzet wagenpark', de: 'Flottenauslastung' , es: 'Utilización de la flota', pl: 'Wykorzystanie floty' }],
  ['Deadhead ratio', { ro: 'Raport alergare în gol', nl: 'Leegloopverhouding', de: 'Leerfahrtquote' , es: 'Tasa de recorrido en vacío', pl: 'Wskaźnik jazd na pusto' }],
  ['Transport cost', { ro: 'Cost transport', nl: 'Transportkosten', de: 'Transportkosten' , es: 'Coste de transporte', pl: 'Koszt transportu' }],
  ['Operating expenses', { ro: 'Cheltuieli operaționale', nl: 'Operationele uitgaven', de: 'Betriebskosten' , es: 'Gastos operativos', pl: 'Koszty operacyjne' }],
  ['Total cost', { ro: 'Cost total', nl: 'Totale kosten', de: 'Gesamtkosten' , es: 'Coste total', pl: 'Koszt całkowity' }],
  ['Revenue / km', { ro: 'Venit / km', nl: 'Opbrengst / km', de: 'Umsatz / km' , es: 'Ingresos / km', pl: 'Przychód / km' }],
  ['Cost / km', { ro: 'Cost / km', nl: 'Kosten / km', de: 'Kosten / km' , es: 'Coste / km', pl: 'Koszt / km' }],
  ['Profit / km', { ro: 'Profit / km', nl: 'Winst / km', de: 'Gewinn / km' , es: 'Beneficio / km', pl: 'Zysk / km' }],
  ['Accounts receivable', { ro: 'Creanțe', nl: 'Debiteuren', de: 'Forderungen' , es: 'Cuentas por cobrar', pl: 'Należności' }],
  ['Overdue receivables', { ro: 'Creanțe restante', nl: 'Vervallen debiteuren', de: 'Überfällige Forderungen' , es: 'Cuentas por cobrar vencidas', pl: 'Należności przeterminowane' }],
  ['Accounts payable', { ro: 'Obligații de plată', nl: 'Crediteuren', de: 'Verbindlichkeiten' , es: 'Cuentas por pagar', pl: 'Zobowiązania' }],
  ['Unbilled revenue', { ro: 'Venituri nefacturate', nl: 'Niet-gefactureerde opbrengsten', de: 'Nicht fakturierter Umsatz' , es: 'Ingresos no facturados', pl: 'Niefakturowane przychody' }],
  ['Average payment days', { ro: 'Zile medii de plată', nl: 'Gemiddelde betaaldagen', de: 'Durchschnittliche Zahlungstage' , es: 'Días medios de pago', pl: 'Średnie dni płatności' }],
  ['Collection rate', { ro: 'Rată de încasare', nl: 'Incassograad', de: 'Einzugsquote' , es: 'Tasa de cobro', pl: 'Wskaźnik ściągalności' }],
  ['Customers', { ro: 'Clienți', nl: 'Klanten', de: 'Kunden' , es: 'Clientes', pl: 'Klienci' }],
  ['Attributed cost', { ro: 'Cost atribuit', nl: 'Toegerekende kosten', de: 'Zugerechnete Kosten' , es: 'Coste atribuido', pl: 'Koszt przypisany' }],
  ['Profit', { ro: 'Profit', nl: 'Winst', de: 'Gewinn' , es: 'Beneficio', pl: 'Zysk' }],
  ['Margin', { ro: 'Marjă', nl: 'Marge', de: 'Marge' , es: 'Margen', pl: 'Marża' }],
  ['Routes', { ro: 'Rute', nl: 'Routes', de: 'Routen' , es: 'Rutas', pl: 'Trasy' }],
  ['Most profitable lane', { ro: 'Cea mai profitabilă rută', nl: 'Meest winstgevende route', de: 'Gewinnbringendste Strecke' , es: 'Ruta más rentable', pl: 'Najbardziej rentowna trasa' }],
  ['Loaded km', { ro: 'Km încărcați', nl: 'Beladen km', de: 'Beladene km' , es: 'Km cargados', pl: 'Km załadowane' }],
  ['Empty km', { ro: 'Km în gol', nl: 'Lege km', de: 'Leer-km' , es: 'Km en vacío', pl: 'Km na pusto' }],
  ['Drivers', { ro: 'Șoferi', nl: 'Chauffeurs', de: 'Fahrer' , es: 'Conductores', pl: 'Kierowcy' }],
  ['Best driver by profit', { ro: 'Cel mai bun șofer după profit', nl: 'Beste chauffeur op winst', de: 'Bester Fahrer nach Gewinn' , es: 'Mejor conductor por beneficio', pl: 'Najlepszy kierowca wg zysku' }],
  ['Total orders', { ro: 'Total comenzi', nl: 'Totaal orders', de: 'Gesamtaufträge' , es: 'Total de pedidos', pl: 'Łączne zamówienia' }],
  ['On-time deliveries', { ro: 'Livrări la timp', nl: 'Op tijd geleverd', de: 'Pünktliche Lieferungen' , es: 'Entregas a tiempo', pl: 'Terminowe dostawy' }],
  ['On-time rate', { ro: 'Rată la timp', nl: 'Op-tijd percentage', de: 'Pünktlichkeitsquote' , es: 'Tasa de puntualidad', pl: 'Wskaźnik terminowości' }],
  ['Late rate', { ro: 'Rată întârzieri', nl: 'Te laat percentage', de: 'Verspätungsquote' , es: 'Tasa de retrasos', pl: 'Wskaźnik opóźnień' }],
  ['Avg delay (min)', { ro: 'Întârziere medie (min)', nl: 'Gemiddelde vertraging (min)', de: 'Durchschnittliche Verspätung (Min.)' , es: 'Retraso medio (min)', pl: 'Śr. opóźnienie (min)' }],
  ['Cancelled', { ro: 'Anulate', nl: 'Geannuleerd', de: 'Storniert' , es: 'Canceladas', pl: 'Anulowane' }],
  ['Not delivered / pending', { ro: 'Nelivrate / în așteptare', nl: 'Niet geleverd / in afwachting', de: 'Nicht geliefert / offen' , es: 'No entregadas / pendientes', pl: 'Niedostarczone / oczekujące' }],
  ['Carriers', { ro: 'Transportatori', nl: 'Vervoerders', de: 'Spediteure' , es: 'Transportistas', pl: 'Przewoźnicy' }],
  ['Total carrier cost', { ro: 'Cost total transportatori', nl: 'Totale vervoerderskosten', de: 'Gesamtkosten Spediteure' , es: 'Coste total de transportistas', pl: 'Łączny koszt przewoźników' }],
  ['Total outstanding', { ro: 'Total de încasat', nl: 'Totaal openstaand', de: 'Gesamt offen' , es: 'Total pendiente', pl: 'Łączne zaległości' }],
  ['Overdue', { ro: 'Restante', nl: 'Vervallen', de: 'Überfällig' , es: 'Vencidas', pl: 'Przeterminowane' }],
  ['Overdue invoices', { ro: 'Facturi restante', nl: 'Vervallen facturen', de: 'Überfällige Rechnungen' , es: 'Facturas vencidas', pl: 'Przeterminowane faktury' }],
  ['Total payable', { ro: 'Total de plătit', nl: 'Totaal te betalen', de: 'Gesamt zu zahlen' , es: 'Total a pagar', pl: 'Łącznie do zapłaty' }],
  ['Carrier costs', { ro: 'Costuri transportatori', nl: 'Vervoerderskosten', de: 'Speditionskosten' , es: 'Costes de transportistas', pl: 'Koszty przewoźników' }],
  ['Payable records', { ro: 'Înregistrări de plătit', nl: 'Te betalen posten', de: 'Zu zahlende Einträge' , es: 'Registros a pagar', pl: 'Pozycje do zapłaty' }],
  ['Exceptions', { ro: 'Excepții', nl: 'Uitzonderingen', de: 'Ausnahmen' , es: 'Excepciones', pl: 'Wyjątki' }],
  ['High severity', { ro: 'Severitate ridicată', nl: 'Hoge ernst', de: 'Hohe Schwere' , es: 'Severidad alta', pl: 'Wysoka ważność' }],
  ['Opening balance', { ro: 'Sold inițial', nl: 'Beginsaldo', de: 'Anfangssaldo' , es: 'Saldo inicial', pl: 'Saldo początkowe' }],
  ['Actual incoming', { ro: 'Încasări efective', nl: 'Werkelijke instroom', de: 'Tatsächliche Einnahmen' , es: 'Entradas reales', pl: 'Rzeczywiste wpływy' }],
  ['Actual outgoing', { ro: 'Plăți efective', nl: 'Werkelijke uitstroom', de: 'Tatsächliche Ausgaben' , es: 'Salidas reales', pl: 'Rzeczywiste wypływy' }],
  ['Projected closing', { ro: 'Sold proiectat', nl: 'Geprojecteerd eindsaldo', de: 'Projizierter Endbestand' , es: 'Saldo proyectado', pl: 'Prognozowane saldo końcowe' }],
  // ---- Table names ----------------------------------------------------------
  ['Order status', { ro: 'Status comenzi', nl: 'Orderstatus', de: 'Auftragsstatus' , es: 'Estado de pedidos', pl: 'Status zamówień' }],
  ['Trip status', { ro: 'Status curse', nl: 'Ritstatus', de: 'Fahrtenstatus' , es: 'Estado de viajes', pl: 'Status przejazdów' }],
  ['Top customers by revenue', { ro: 'Top clienți după venituri', nl: 'Top klanten op opbrengsten', de: 'Top-Kunden nach Umsatz' , es: 'Principales clientes por ingresos', pl: 'Najlepsi klienci wg przychodów' }],
  ['Routes by profitability', { ro: 'Rute după profitabilitate', nl: 'Routes op winstgevendheid', de: 'Routen nach Rentabilität' , es: 'Rutas por rentabilidad', pl: 'Trasy wg rentowności' }],
  ['Cost breakdown', { ro: 'Defalcare costuri', nl: 'Kostenspecificatie', de: 'Kostenaufschlüsselung' , es: 'Desglose de costes', pl: 'Struktura kosztów' }],
  ['Receivables aging', { ro: 'Vechimea creanțelor', nl: 'Vervaltijd debiteuren', de: 'Forderungsaltersstruktur' , es: 'Antigüedad de las cuentas por cobrar', pl: 'Struktura wiekowa należności' }],
  ['Payables', { ro: 'Obligații de plată', nl: 'Crediteuren', de: 'Verbindlichkeiten' , es: 'Cuentas por pagar', pl: 'Zobowiązania' }],
  ['Monthly breakdown', { ro: 'Defalcare lunară', nl: 'Maandelijkse uitsplitsing', de: 'Monatliche Aufschlüsselung' , es: 'Desglose mensual', pl: 'Podział miesięczny' }],
  ['Fleet', { ro: 'Flotă', nl: 'Wagenpark', de: 'Flotte' , es: 'Flota', pl: 'Flota' }],
  ['Aging buckets', { ro: 'Grupuri de vechime', nl: 'Vervaltijdgroepen', de: 'Altersgruppen' , es: 'Grupos de antigüedad', pl: 'Przedziały wiekowe' }],
  ['Open invoices', { ro: 'Facturi deschise', nl: 'Openstaande facturen', de: 'Offene Rechnungen' , es: 'Facturas abiertas', pl: 'Otwarte faktury' }],
  ['Projection', { ro: 'Proiecție', nl: 'Prognose', de: 'Prognose' , es: 'Proyección', pl: 'Prognoza' }],
  ['Cash flows', { ro: 'Fluxuri de numerar', nl: 'Kasstromen', de: 'Cashflows' , es: 'Flujos de caja', pl: 'Przepływy pieniężne' }],
  ['Definitions', { ro: 'Definiții', nl: 'Definities', de: 'Definitionen' , es: 'Definiciones', pl: 'Definicje' }],
  // ---- Column headers -------------------------------------------------------
  ['Status', { ro: 'Status', nl: 'Status', de: 'Status' , es: 'Estado', pl: 'Status' }],
  ['Trips', { ro: 'Curse', nl: 'Ritten', de: 'Fahrten' , es: 'Viajes', pl: 'Przejazdy' }],
  ['Customer', { ro: 'Client', nl: 'Klant', de: 'Kunde' , es: 'Cliente', pl: 'Klient' }],
  ['Route', { ro: 'Rută', nl: 'Route', de: 'Route' , es: 'Ruta', pl: 'Trasa' }],
  ['Cost', { ro: 'Cost', nl: 'Kosten', de: 'Kosten' , es: 'Coste', pl: 'Koszt' }],
  ['Category', { ro: 'Categorie', nl: 'Categorie', de: 'Kategorie' , es: 'Categoría', pl: 'Kategoria' }],
  ['Amount', { ro: 'Sumă', nl: 'Bedrag', de: 'Betrag' , es: 'Importe', pl: 'Kwota' }],
  ['Share', { ro: 'Cotă', nl: 'Aandeel', de: 'Anteil' , es: 'Parte', pl: 'Udział' }],
  ['Bucket', { ro: 'Grup', nl: 'Groep', de: 'Gruppe' , es: 'Grupo', pl: 'Przedział' }],
  ['Invoices', { ro: 'Facturi', nl: 'Facturen', de: 'Rechnungen' , es: 'Facturas', pl: 'Faktury' }],
  ['Outstanding', { ro: 'Neîncasat', nl: 'Openstaand', de: 'Offen' , es: 'Pendiente', pl: 'Zaległe' }],
  ['Payable', { ro: 'De plătit', nl: 'Te betalen', de: 'Zahlbar' , es: 'A pagar', pl: 'Do zapłaty' }],
  ['Date', { ro: 'Dată', nl: 'Datum', de: 'Datum' , es: 'Fecha', pl: 'Data' }],
  ['Truck', { ro: 'Camion', nl: 'Vrachtwagen', de: 'LKW' , es: 'Camión', pl: 'Pojazd' }],
  ['On-time', { ro: 'La timp', nl: 'Op tijd', de: 'Pünktlich' , es: 'A tiempo', pl: 'Na czas' }],
  ['Delivery %', { ro: 'Livrat %', nl: 'Levering %', de: 'Lieferung %' , es: 'Entrega %', pl: 'Dostawa %' }],
  ['Late', { ro: 'Întârziate', nl: 'Te laat', de: 'Verspätet' , es: 'Retrasado', pl: 'Opóźnione' }],
  ['Late %', { ro: 'Întârziat %', nl: 'Te laat %', de: 'Verspätet %' , es: 'Retrasado %', pl: 'Opóźnienia %' }],
  ['Avg late (min)', { ro: 'Întârziere medie (min)', nl: 'Gem. vertraging (min)', de: 'Durchschn. Verspätung (Min.)' , es: 'Retraso medio (min)', pl: 'Śr. opóźnienie (min)' }],
  ['Not delivered', { ro: 'Nelivrate', nl: 'Niet geleverd', de: 'Nicht geliefert' , es: 'No entregadas', pl: 'Niedostarczone' }],
  ['Period', { ro: 'Perioadă', nl: 'Periode', de: 'Zeitraum' , es: 'Período', pl: 'Okres' }],
  ['Driver', { ro: 'Șofer', nl: 'Chauffeur', de: 'Fahrer' , es: 'Conductor', pl: 'Kierowca' }],
  ['Carrier', { ro: 'Transportator', nl: 'Vervoerder', de: 'Spediteur' , es: 'Transportista', pl: 'Przewoźnik' }],
  ['Carrier cost', { ro: 'Cost transportator', nl: 'Vervoerderskosten', de: 'Speditionskosten' , es: 'Coste del transportista', pl: 'Koszt przewoźnika' }],
  ['Margin impact', { ro: 'Impact marjă', nl: 'Marge-impact', de: 'Marge-Einfluss' , es: 'Impacto en el margen', pl: 'Wpływ na marżę' }],
  ['Invoice', { ro: 'Factură', nl: 'Factuur', de: 'Rechnung' , es: 'Factura', pl: 'Faktura' }],
  ['Client', { ro: 'Client', nl: 'Klant', de: 'Kunde' , es: 'Cliente', pl: 'Klient' }],
  ['Issued', { ro: 'Emisă', nl: 'Gefactureerd', de: 'Ausgestellt' , es: 'Emitida', pl: 'Wystawiona' }],
  ['Due', { ro: 'Scadență', nl: 'Vervaldatum', de: 'Fällig' , es: 'Vencimiento', pl: 'Termin płatności' }],
  ['Paid', { ro: 'Plătit', nl: 'Betaald', de: 'Bezahlt' , es: 'Pagada', pl: 'Opłacona' }],
  ['Days overdue', { ro: 'Zile restante', nl: 'Dagen vervallen', de: 'Tage überfällig' , es: 'Días de retraso', pl: 'Dni po terminie' }],
  ['Severity', { ro: 'Severitate', nl: 'Ernst', de: 'Schweregrad' , es: 'Severidad', pl: 'Ważność' }],
  ['Time', { ro: 'Ora', nl: 'Tijd', de: 'Zeit' , es: 'Hora', pl: 'Czas' }],
  ['Type', { ro: 'Tip', nl: 'Type', de: 'Typ' , es: 'Tipo', pl: 'Typ' }],
  ['Order', { ro: 'Comandă', nl: 'Order', de: 'Auftrag' , es: 'Pedido', pl: 'Zamówienie' }],
  ['Message', { ro: 'Mesaj', nl: 'Bericht', de: 'Nachricht' , es: 'Mensaje', pl: 'Wiadomość' }],
  ['Month', { ro: 'Lună', nl: 'Maand', de: 'Monat' , es: 'Mes', pl: 'Miesiąc' }],
  ['Expected in', { ro: 'Încasări estimate', nl: 'Verwachte instroom', de: 'Erwartete Einnahmen' , es: 'Entradas previstas', pl: 'Planowane wpływy' }],
  ['Expected out', { ro: 'Plăți estimate', nl: 'Verwachte uitstroom', de: 'Erwartete Ausgaben' , es: 'Salidas previstas', pl: 'Planowane wypływy' }],
  ['Balance', { ro: 'Sold', nl: 'Saldo', de: 'Saldo' , es: 'Saldo', pl: 'Saldo' }],
  ['Item', { ro: 'Element', nl: 'Post', de: 'Position' , es: 'Elemento', pl: 'Pozycja' }],
  ['Key', { ro: 'Cheie', nl: 'Sleutel', de: 'Schlüssel' , es: 'Clave', pl: 'Klucz' }],
  ['Name', { ro: 'Nume', nl: 'Naam', de: 'Name' , es: 'Nombre', pl: 'Nazwa' }],
  ['Section', { ro: 'Secțiune', nl: 'Sectie', de: 'Abschnitt' , es: 'Sección', pl: 'Sekcja' }],
  ['Unit', { ro: 'Unitate', nl: 'Eenheid', de: 'Einheit' , es: 'Unidad', pl: 'Jednostka' }],
  ['Definition', { ro: 'Definiție', nl: 'Definitie', de: 'Definition' , es: 'Definición', pl: 'Definicja' }],
  ['Source', { ro: 'Sursă', nl: 'Bron', de: 'Quelle' , es: 'Fuente', pl: 'Źródło' }],
  ['Formula', { ro: 'Formulă', nl: 'Formule', de: 'Formel' , es: 'Fórmula', pl: 'Formuła' }],
  // ---- Chart titles ---------------------------------------------------------
  ['Order Status Distribution', { ro: 'Distribuția statusurilor comenzilor', nl: 'Verdeling orderstatussen', de: 'Verteilung der Auftragsstatus' , es: 'Distribución del estado de pedidos', pl: 'Rozkład statusów zamówień' }],
  ['Financial Trend', { ro: 'Tendință financiară', nl: 'Financiële trend', de: 'Finanzieller Trend' , es: 'Tendencia financiera', pl: 'Trend finansowy' }],
  ['Orders vs Delivered vs On-time (trend)', { ro: 'Comenzi vs Livrate vs La timp (tendință)', nl: 'Orders vs Geleverd vs Op tijd (trend)', de: 'Aufträge vs. Geliefert vs. Pünktlich (Trend)' , es: 'Pedidos vs Entregados vs A tiempo (tendencia)', pl: 'Zamówienia vs dostarczone vs na czas (trend)' }],
  ['On-time delivery rate by customer (%)', { ro: 'Rată de livrare la timp pe client (%)', nl: 'Op-tijd leveringspercentage per klant (%)', de: 'Pünktliche Lieferquote je Kunde (%)' , es: 'Tasa de entregas a tiempo por cliente (%)', pl: 'Wskaźnik terminowych dostaw wg klienta (%)' }],
  ['Trip Status Distribution', { ro: 'Distribuția statusurilor curselor', nl: 'Verdeling ritstatussen', de: 'Verteilung der Fahrtstatus' , es: 'Distribución del estado de viajes', pl: 'Rozkład statusów przejazdów' }],
  ['Routes by profit', { ro: 'Rute după profit', nl: 'Routes op winst', de: 'Routen nach Gewinn' , es: 'Rutas por beneficio', pl: 'Trasy wg zysku' }],
  ['Invoiced vs collected', { ro: 'Facturate vs încasate', nl: 'Gefactureerd vs geïncasseerd', de: 'Fakturiert vs. eingezogen' , es: 'Facturado vs cobrado', pl: 'Zafakturowane vs zainkasowane' }],
  ['Revenue by customer', { ro: 'Venituri pe client', nl: 'Opbrengsten per klant', de: 'Umsatz je Kunde' , es: 'Ingresos por cliente', pl: 'Przychody wg klienta' }],
  ['Margin & OTIF by customer', { ro: 'Marjă și OTIF per client', nl: 'Marge en OTIF per klant', de: 'Marge und OTIF je Kunde' , es: 'Margen y OTIF por cliente', pl: 'Marża i OTIF wg klienta' }],
  ['Route margin & OTIF %', { ro: 'Marjă rută și OTIF %', nl: 'Routemarge en OTIF %', de: 'Routenmarge und OTIF %' , es: 'Margen de ruta y OTIF %', pl: 'Marża trasy i OTIF %' }],
  ['Fleet status', { ro: 'Starea flotei', nl: 'Wagenparkstatus', de: 'Flottenstatus' , es: 'Estado de la flota', pl: 'Status floty' }],
  ['Revenue vs cost by truck', { ro: 'Venituri vs costuri pe camion', nl: 'Opbrengsten vs kosten per vrachtwagen', de: 'Umsatz vs. Kosten je LKW' , es: 'Ingresos vs costes por camión', pl: 'Przychody vs koszty wg pojazdu' }],
  ['Loaded vs empty km by truck', { ro: 'Km încărcați vs în gol pe camion', nl: 'Beladen vs lege km per vrachtwagen', de: 'Beladene vs. Leer-km je LKW' , es: 'Km cargados vs en vacío por camión', pl: 'Km załadowane vs na pusto wg pojazdu' }],
  ['Profit by driver', { ro: 'Profit pe șofer', nl: 'Winst per chauffeur', de: 'Gewinn je Fahrer' , es: 'Beneficio por conductor', pl: 'Zysk wg kierowcy' }],
  ['OTIF by driver', { ro: 'OTIF pe șofer', nl: 'OTIF per chauffeur', de: 'OTIF je Fahrer' , es: 'OTIF por conductor', pl: 'OTIF wg kierowcy' }],
  ['Margin impact by carrier', { ro: 'Impact marjă pe transportator', nl: 'Marge-impact per vervoerder', de: 'Marge-Einfluss je Spediteur' , es: 'Impacto en el margen por transportista', pl: 'Wpływ na marżę wg przewoźnika' }],
  ['Outstanding by age bucket', { ro: 'Neîncasat pe grupuri de vechime', nl: 'Openstaand per vervaltijdgroep', de: 'Offen nach Altersgruppe' , es: 'Pendiente por grupo de antigüedad', pl: 'Zaległości wg przedziału wiekowego' }],
  ['Invoiced vs collected trend', { ro: 'Tendință facturate vs încasate', nl: 'Trend gefactureerd vs geïncasseerd', de: 'Trend fakturiert vs. eingezogen' , es: 'Tendencia de facturado vs cobrado', pl: 'Trend zafakturowane vs zainkasowane' }],
  ['Top payable items', { ro: 'Top elemente de plătit', nl: 'Top te betalen posten', de: 'Top zu zahlende Posten' , es: 'Principales partidas a pagar', pl: 'Najważniejsze pozycje do zapłaty' }],
  ['Payables mix', { ro: 'Componența obligațiilor de plată', nl: 'Samenstelling crediteuren', de: 'Zusammensetzung der Verbindlichkeiten' , es: 'Composición de las cuentas por pagar', pl: 'Struktura zobowiązań' }],
  ['Exceptions by severity', { ro: 'Excepții pe severitate', nl: 'Uitzonderingen op ernst', de: 'Ausnahmen nach Schweregrad' , es: 'Excepciones por severidad', pl: 'Wyjątki wg ważności' }],
  ['Top exception types', { ro: 'Top tipuri de excepții', nl: 'Top uitzonderingstypen', de: 'Top Ausnahmetypen' , es: 'Principales tipos de excepción', pl: 'Najczęstsze typy wyjątków' }],
  ['Cash flow summary', { ro: 'Rezumat flux de numerar', nl: 'Samenvatting kasstromen', de: 'Zusammenfassung Cashflow' , es: 'Resumen del flujo de caja', pl: 'Podsumowanie przepływów pieniężnych' }],
  // ---- Chart series ---------------------------------------------------------
  ['Delivered', { ro: 'Livrate', nl: 'Geleverd', de: 'Geliefert' , es: 'Entregados', pl: 'Dostarczone' }],
  ['On-time %', { ro: 'La timp %', nl: 'Op tijd %', de: 'Pünktlich %' , es: 'A tiempo %', pl: 'Na czas %' }],
  ['Invoiced', { ro: 'Facturate', nl: 'Gefactureerd', de: 'Fakturiert' , es: 'Facturado', pl: 'Zafakturowane' }],
  ['Collected', { ro: 'Încasate', nl: 'Geïncasseerd', de: 'Eingezogen' , es: 'Cobrado', pl: 'Zainkasowane' }],
  ['OTIF', { ro: 'OTIF', nl: 'OTIF', de: 'OTIF' , es: 'OTIF', pl: 'OTIF' }],
  ['Trucks', { ro: 'Camioane', nl: 'Vrachtwagens', de: 'LKW' , es: 'Camiones', pl: 'Pojazdy' }],
  // ---- Document chrome (PDF / Excel) ---------------------------------------
  ['Key figures', { ro: 'Indicatori-cheie', nl: 'Kerncijfers', de: 'Kennzahlen' , es: 'Cifras clave', pl: 'Kluczowe wskaźniki' }],
  ['Generated', { ro: 'Generat', nl: 'Gegenereerd', de: 'Generiert' , es: 'Generado', pl: 'Wygenerowano' }],
  ['Charts', { ro: 'Grafice', nl: 'Grafieken', de: 'Diagramme' , es: 'Gráficos', pl: 'Wykresy' }],
  ['Total', { ro: 'Total', nl: 'Totaal', de: 'Gesamt' , es: 'Total', pl: 'Razem' }],
  ['KPI', { ro: 'KPI', nl: 'KPI', de: 'KPI' , es: 'KPI', pl: 'KPI' }],
  ['Value', { ro: 'Valoare', nl: 'Waarde', de: 'Wert' , es: 'Valor', pl: 'Wartość' }],
  ['Trend', { ro: 'Tendință', nl: 'Trend', de: 'Trend' , es: 'Tendencia', pl: 'Trend' }],
];

// ---- French (fr) translations, merged into DICT below ---------------------
export const FR_ROWS: Array<[string, string]> = [
  // ---- Report names ---------------------------------------------------------
  ['Executive Overview', "Vue d'ensemble exécutive"],
  ['Financial Position (P&L)', 'Situation financière (P&L)'],
  ['Customer Profitability', 'Rentabilité par client'],
  ['Route Profitability', 'Rentabilité par route'],
  ['Fleet Performance', 'Performance de la flotte'],
  ['Driver Performance', 'Performance des chauffeurs'],
  ['Customer Service Performance', 'Performance du service client'],
  ['Carrier & Subcontractor Costs', 'Coûts transporteurs et sous-traitants'],
  ['Receivables Aging', 'Ancienneté des créances'],
  ['Accounts Payable', 'Comptes fournisseurs'],
  ['Exceptions Register', "Registre des exceptions"],
  ['Cash Flow Projection', 'Projection de trésorerie'],
  ['KPI Methodology', 'Méthodologie KPI'],
  // ---- Report descriptions --------------------------------------------------
  ['Operations, service and fleet performance snapshot over the period.', 'Aperçu des opérations, du service et des performances de la flotte sur la période.'],
  ['Revenue, costs, profit and receivables/payables position.', 'Revenus, coûts, bénéfice et position des créances/dettes.'],
  ['Revenue, cost, profit and OTIF per customer.', 'Revenus, coûts, bénéfice et OTIF par client.'],
  ['Profitability of each origin → destination lane.', 'Rentabilité de chaque liaison origine → destination.'],
  ['Vehicle-level km, revenue, cost, profit and utilization.', "Kilomètres, revenus, coûts, bénéfice et utilisation par véhicule."],
  ['Driver-level trips, km, revenue, cost, profit and on-time delivery.', "Courses, km, revenus, coûts, bénéfice et livraisons à l'heure par chauffeur."],
  ['Per-customer delivery performance over the period: orders, on-time, late, cancelled and OTIF, with trend charts.', "Performance de livraison par client sur la période : commandes, à l'heure, en retard, annulées et OTIF, avec graphiques de tendance."],
  ['External carrier cost exposure and margin impact per carrier.', "Exposition aux coûts des transporteurs externes et impact sur la marge par transporteur."],
  ['Outstanding invoices bucketed by age and detailed open list.', "Factures impayées classées par ancienneté et liste détaillée des factures ouvertes."],
  ['Unpaid carrier and subcontractor costs plus outstanding settlements.', "Coûts impayés des transporteurs et sous-traitants plus règlements en attente."],
  ['Operational exceptions detected in the period (severity sorted).', 'Exceptions opérationnelles détectées sur la période (triées par gravité).'],
  ['Actual and expected cash in/out and rolling 3-month projection.', "Entrées/sorties de trésorerie réelles et attendues et projection glissante sur 3 mois."],
  ['The definition and source of every dashboard KPI (support/reference document).', "La définition et la source de chaque KPI du tableau de bord (document de référence)."],
  ['Definition and source of every dashboard KPI.', 'Définition et source de chaque KPI du tableau de bord.'],
  // ---- KPI labels -----------------------------------------------------------
  ['Orders', 'Commandes'],
  ['Open orders', 'Commandes ouvertes'],
  ['Active trips', 'Courses actives'],
  ['Completed trips', 'Courses terminées'],
  ['Deliveries', 'Livraisons'],
  ['Late deliveries', 'Livraisons en retard'],
  ['Open exceptions', 'Exceptions ouvertes'],
  ['Revenue', 'Revenus'],
  ['Gross profit', 'Bénéfice brut'],
  ['Gross margin', 'Marge brute'],
  ['Fleet utilization', 'Utilisation de la flotte'],
  ['Deadhead ratio', 'Taux de kilomètres à vide'],
  ['Transport cost', 'Coût de transport'],
  ['Operating expenses', "Charges d'exploitation"],
  ['Total cost', 'Coût total'],
  ['Revenue / km', 'Revenu / km'],
  ['Cost / km', 'Coût / km'],
  ['Profit / km', 'Bénéfice / km'],
  ['Accounts receivable', 'Créances clients'],
  ['Overdue receivables', 'Créances en retard'],
  ['Accounts payable', 'Dettes fournisseurs'],
  ['Unbilled revenue', 'Revenus non facturés'],
  ['Average payment days', 'Délai moyen de paiement'],
  ['Collection rate', "Taux d'encaissement"],
  ['Customers', 'Clients'],
  ['Attributed cost', 'Coût imputé'],
  ['Profit', 'Bénéfice'],
  ['Margin', 'Marge'],
  ['Routes', 'Routes'],
  ['Most profitable lane', 'Liaison la plus rentable'],
  ['Loaded km', 'Km chargés'],
  ['Empty km', 'Km à vide'],
  ['Drivers', 'Chauffeurs'],
  ['Best driver by profit', 'Meilleur chauffeur par bénéfice'],
  ['Total orders', 'Total commandes'],
  ['On-time deliveries', "Livraisons à l'heure"],
  ['On-time rate', 'Taux de ponctualité'],
  ['Late rate', 'Taux de retard'],
  ['Avg delay (min)', 'Retard moyen (min)'],
  ['Cancelled', 'Annulées'],
  ['Not delivered / pending', 'Non livrées / en attente'],
  ['Carriers', 'Transporteurs'],
  ['Total carrier cost', 'Coût total transporteurs'],
  ['Total outstanding', 'Total en attente'],
  ['Overdue', 'En retard'],
  ['Overdue invoices', 'Factures en retard'],
  ['Total payable', 'Total à payer'],
  ['Carrier costs', 'Coûts transporteurs'],
  ['Payable records', 'Enregistrements à payer'],
  ['Exceptions', 'Exceptions'],
  ['High severity', 'Gravité élevée'],
  ['Opening balance', "Solde d'ouverture"],
  ['Actual incoming', 'Entrées réelles'],
  ['Actual outgoing', 'Sorties réelles'],
  ['Projected closing', 'Solde projeté'],
  // ---- Table names ----------------------------------------------------------
  ['Order status', 'Statut des commandes'],
  ['Trip status', 'Statut des courses'],
  ['Top customers by revenue', 'Top clients par revenus'],
  ['Routes by profitability', 'Routes par rentabilité'],
  ['Cost breakdown', 'Détail des coûts'],
  ['Receivables aging', 'Ancienneté des créances'],
  ['Payables', 'Comptes fournisseurs'],
  ['Monthly breakdown', 'Détail mensuel'],
  ['Fleet', 'Flotte'],
  ['Aging buckets', "Tranches d'ancienneté"],
  ['Open invoices', 'Factures ouvertes'],
  ['Projection', 'Projection'],
  ['Cash flows', 'Flux de trésorerie'],
  ['Definitions', 'Définitions'],
  // ---- Column headers -------------------------------------------------------
  ['Status', 'Statut'],
  ['Trips', 'Courses'],
  ['Customer', 'Client'],
  ['Route', 'Route'],
  ['Cost', 'Coût'],
  ['Category', 'Catégorie'],
  ['Amount', 'Montant'],
  ['Share', 'Part'],
  ['Bucket', 'Tranche'],
  ['Invoices', 'Factures'],
  ['Outstanding', 'En attente'],
  ['Payable', 'À payer'],
  ['Date', 'Date'],
  ['Truck', 'Camion'],
  ["On-time", "À l'heure"],
  ['Delivery %', 'Livraison %'],
  ['Late', 'En retard'],
  ['Late %', 'En retard %'],
  ['Avg late (min)', 'Retard moy. (min)'],
  ['Not delivered', 'Non livrées'],
  ['Period', 'Période'],
  ['Driver', 'Chauffeur'],
  ['Carrier', 'Transporteur'],
  ['Carrier cost', 'Coût transporteur'],
  ['Margin impact', 'Impact marge'],
  ['Invoice', 'Facture'],
  ['Client', 'Client'],
  ['Issued', 'Émise'],
  ['Due', 'Échéance'],
  ['Paid', 'Payée'],
  ['Days overdue', 'Jours de retard'],
  ['Severity', 'Gravité'],
  ['Time', 'Heure'],
  ['Type', 'Type'],
  ['Order', 'Commande'],
  ['Message', 'Message'],
  ['Month', 'Mois'],
  ['Expected in', 'Entrées prévues'],
  ['Expected out', 'Sorties prévues'],
  ['Balance', 'Solde'],
  ['Item', 'Élément'],
  ['Key', 'Clé'],
  ['Name', 'Nom'],
  ['Section', 'Section'],
  ['Unit', 'Unité'],
  ['Definition', 'Définition'],
  ['Source', 'Source'],
  ['Formula', 'Formule'],
  // ---- Chart titles ---------------------------------------------------------
  ['Order Status Distribution', 'Répartition des statuts de commandes'],
  ['Financial Trend', 'Tendance financière'],
  ['Orders vs Delivered vs On-time (trend)', "Commandes vs Livrées vs À l'heure (tendance)"],
  ['On-time delivery rate by customer (%)', "Taux de livraison à l'heure par client (%)"],
  ['Trip Status Distribution', 'Répartition des statuts de courses'],
  ['Routes by profit', 'Routes par bénéfice'],
  ['Invoiced vs collected', 'Facturé vs encaissé'],
  ['Revenue by customer', 'Revenus par client'],
  ['Margin & OTIF by customer', 'Marge et OTIF par client'],
  ['Route margin & OTIF %', 'Marge et OTIF % par route'],
  ['Fleet status', 'Statut de la flotte'],
  ['Revenue vs cost by truck', 'Revenus vs coûts par camion'],
  ['Loaded vs empty km by truck', 'Km chargés vs à vide par camion'],
  ['Profit by driver', 'Bénéfice par chauffeur'],
  ['OTIF by driver', 'OTIF par chauffeur'],
  ['Margin impact by carrier', 'Impact marge par transporteur'],
  ['Outstanding by age bucket', "En attente par tranche d'ancienneté"],
  ['Invoiced vs collected trend', 'Tendance facturé vs encaissé'],
  ['Top payable items', 'Top des éléments à payer'],
  ['Payables mix', 'Composition des dettes fournisseurs'],
  ['Exceptions by severity', 'Exceptions par gravité'],
  ['Top exception types', "Top des types d'exceptions"],
  ['Cash flow summary', 'Résumé des flux de trésorerie'],
  // ---- Chart series ---------------------------------------------------------
  ['Delivered', 'Livrées'],
  ['On-time %', "À l'heure %"],
  ['Invoiced', 'Facturé'],
  ['Collected', 'Encaissé'],
  ['OTIF', 'OTIF'],
  ['Trucks', 'Camions'],
  // ---- Document chrome (PDF / Excel) ----------------------------------------
  ['Key figures', 'Indicateurs clés'],
  ['Generated', 'Généré'],
  ['Charts', 'Graphiques'],
  ['Total', 'Total'],
  ['KPI', 'KPI'],
  ['Value', 'Valeur'],
  ['Trend', 'Tendance'],
];

const DICT: Record<string, Partial<Record<ReportLocale, string>>> = {};
for (const [key, val] of ROWS) DICT[key] = val;
for (const [key, val] of FR_ROWS) DICT[key] = { ...(DICT[key] || {}), fr: val };

export const UNIT_ROWS: Array<[string, Record<ReportLocale, string>]> = [
  ['EUR', { ro: '€', nl: '€', fr: '€', de: '€', en: '€', es: '€', pl: '€' }],
  ['EUR/km', { ro: '€/km', nl: '€/km', fr: '€/km', de: '€/km', en: '€/km', es: '€/km', pl: '€/km' }],
  ['EUR/month', { ro: '€/lună', nl: '€/maand', fr: '€/mois', de: '€/Monat', en: '€/month', es: '€/mes', pl: '€/miesiąc' }],
  ['EUR/order', { ro: '€/comandă', nl: '€/order', fr: '€/commande', de: '€/Auftrag', en: '€/order', es: '€/pedido', pl: '€/zamówienie' }],
  ['EUR/trip', { ro: '€/cursă', nl: '€/rit', fr: '€/course', de: '€/Fahrt', en: '€/trip', es: '€/viaje', pl: '€/kurs' }],
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