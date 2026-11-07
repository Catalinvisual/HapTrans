/** Seven-language copy for the operational summary shown on the first screen. */
export type SummaryKey =
  | 'summary' | 'pickup' | 'delivery' | 'cargo' | 'progress'
  | 'loading_ref' | 'unloading_ref' | 'order' | 'pallets' | 'weight'
  | 'volume' | 'ldm' | 'current_stop' | 'next_action' | 'not_planned'
  | 'awaiting' | 'completed_stops' | 'no_orders' | 'not_available';

const en: Record<SummaryKey, string> = {
  summary: 'Operational summary', pickup: 'Pickup', delivery: 'Delivery', cargo: 'Cargo', progress: 'Progress',
  loading_ref: 'Loading ref.', unloading_ref: 'Unloading ref.', order: 'Order', pallets: 'Pallets', weight: 'Weight',
  volume: 'Volume', ldm: 'LDM', current_stop: 'Current stop', next_action: 'Next action', not_planned: 'Not planned',
  awaiting: 'Awaiting assignment', completed_stops: '{{done}} / {{total}} stops completed', no_orders: 'No orders', not_available: 'Not available',
};
const ro: Record<SummaryKey, string> = {
  summary: 'Rezumat operațional', pickup: 'Încărcare', delivery: 'Descărcare', cargo: 'Marfă', progress: 'Progres',
  loading_ref: 'Ref. încărcare', unloading_ref: 'Ref. descărcare', order: 'Comandă', pallets: 'Paleți', weight: 'Greutate',
  volume: 'Volum', ldm: 'LDM', current_stop: 'Oprirea curentă', next_action: 'Următoarea acțiune', not_planned: 'Neplanificat',
  awaiting: 'În așteptarea alocării', completed_stops: '{{done}} / {{total}} opriiri finalizate', no_orders: 'Nicio comandă', not_available: 'Indisponibil',
};
const nl: Record<SummaryKey, string> = {
  summary: 'Operationeel overzicht', pickup: 'Laden', delivery: 'Lossen', cargo: 'Lading', progress: 'Voortgang',
  loading_ref: 'Laadreferentie', unloading_ref: 'Losreferentie', order: 'Opdracht', pallets: 'Pallets', weight: 'Gewicht',
  volume: 'Volume', ldm: 'LDM', current_stop: 'Huidige stop', next_action: 'Volgende actie', not_planned: 'Niet gepland',
  awaiting: 'Wacht op toewijzing', completed_stops: '{{done}} / {{total}} stops voltooid', no_orders: 'Geen opdrachten', not_available: 'Niet beschikbaar',
};
const de: Record<SummaryKey, string> = {
  summary: 'Betriebsübersicht', pickup: 'Beladung', delivery: 'Entladung', cargo: 'Ladung', progress: 'Fortschritt',
  loading_ref: 'Beladereferenz', unloading_ref: 'Entladereferenz', order: 'Auftrag', pallets: 'Paletten', weight: 'Gewicht',
  volume: 'Volumen', ldm: 'LDM', current_stop: 'Aktueller Stopp', next_action: 'Nächste Aktion', not_planned: 'Nicht geplant',
  awaiting: 'Wartet auf Zuweisung', completed_stops: '{{done}} / {{total}} Stopps erledigt', no_orders: 'Keine Aufträge', not_available: 'Nicht verfügbar',
};
const fr: Record<SummaryKey, string> = {
  summary: 'Résumé opérationnel', pickup: 'Chargement', delivery: 'Livraison', cargo: 'Marchandise', progress: 'Progression',
  loading_ref: 'Réf. chargement', unloading_ref: 'Réf. déchargement', order: 'Commande', pallets: 'Palettes', weight: 'Poids',
  volume: 'Volume', ldm: 'LDM', current_stop: 'Arrêt actuel', next_action: 'Action suivante', not_planned: 'Non planifié',
  awaiting: 'En attente d’affectation', completed_stops: '{{done}} / {{total}} arrêts terminés', no_orders: 'Aucune commande', not_available: 'Non disponible',
};
const es: Record<SummaryKey, string> = {
  summary: 'Resumen operativo', pickup: 'Carga', delivery: 'Descarga', cargo: 'Mercancía', progress: 'Progreso',
  loading_ref: 'Ref. de carga', unloading_ref: 'Ref. de descarga', order: 'Pedido', pallets: 'Palés', weight: 'Peso',
  volume: 'Volumen', ldm: 'LDM', current_stop: 'Parada actual', next_action: 'Siguiente acción', not_planned: 'No planificado',
  awaiting: 'Esperando asignación', completed_stops: '{{done}} / {{total}} paradas completadas', no_orders: 'Sin pedidos', not_available: 'No disponible',
};
const pl: Record<SummaryKey, string> = {
  summary: 'Podsumowanie operacyjne', pickup: 'Załadunek', delivery: 'Rozładunek', cargo: 'Ładunek', progress: 'Postęp',
  loading_ref: 'Ref. załadunku', unloading_ref: 'Ref. rozładunku', order: 'Zlecenie', pallets: 'Palety', weight: 'Waga',
  volume: 'Objętość', ldm: 'LDM', current_stop: 'Bieżący przystanek', next_action: 'Następna czynność', not_planned: 'Niezaplanowane',
  awaiting: 'Oczekuje na przydział', completed_stops: '{{done}} / {{total}} przystanków zakończonych', no_orders: 'Brak zleceń', not_available: 'Niedostępne',
};

const bundles: Record<string, Record<SummaryKey, string>> = { en, ro, nl, de, fr, es, pl };

export function summaryText(locale: string, key: SummaryKey, vars?: Record<string, string | number>): string {
  const base = String(locale || 'en').slice(0, 2).toLowerCase();
  let text = (bundles[base] || en)[key];
  for (const [name, value] of Object.entries(vars || {})) {
    text = text.replace(new RegExp(`\\{\\{${name}\\}\\}`, 'g'), String(value));
  }
  return text;
}