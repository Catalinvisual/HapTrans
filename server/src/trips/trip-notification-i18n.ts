export type NotificationLanguage = 'ro' | 'en' | 'nl' | 'de' | 'fr' | 'es' | 'pl';

const SUPPORTED: NotificationLanguage[] = ['ro', 'en', 'nl', 'de', 'fr', 'es', 'pl'];

export function normalizeNotificationLanguage(value: unknown): NotificationLanguage {
  const code = String(value || '').trim().toLowerCase().split('-')[0];
  return (SUPPORTED as string[]).includes(code) ? (code as NotificationLanguage) : 'en';
}

type StopEvent = 'arrived_pickup' | 'arrived_delivery' | 'loading' | 'unloading' | 'loaded' | 'delivered';

const STOP_EVENTS: Record<NotificationLanguage, Record<StopEvent, string>> = {
  ro: {
    arrived_pickup: 'Ai ajuns la încărcare',
    arrived_delivery: 'Ai ajuns la descărcare',
    loading: 'Încărcarea a început',
    unloading: 'Descărcarea a început',
    loaded: 'Încărcarea este finalizată',
    delivered: 'Livrarea este finalizată (POD)',
  },
  en: {
    arrived_pickup: 'Arrived at pickup',
    arrived_delivery: 'Arrived at delivery',
    loading: 'Loading started',
    unloading: 'Unloading started',
    loaded: 'Loading completed',
    delivered: 'Delivery completed (POD)',
  },
  nl: {
    arrived_pickup: 'Aangekomen bij laadadres',
    arrived_delivery: 'Aangekomen bij losadres',
    loading: 'Laden gestart',
    unloading: 'Lossen gestart',
    loaded: 'Laden voltooid',
    delivered: 'Levering voltooid (POD)',
  },
  de: {
    arrived_pickup: 'Am Beladeort angekommen',
    arrived_delivery: 'Am Entladeort angekommen',
    loading: 'Beladung begonnen',
    unloading: 'Entladung begonnen',
    loaded: 'Beladung abgeschlossen',
    delivered: 'Lieferung abgeschlossen (POD)',
  },
  fr: {
    arrived_pickup: 'Arrivé au chargement',
    arrived_delivery: 'Arrivé à la livraison',
    loading: 'Chargement commencé',
    unloading: 'Déchargement commencé',
    loaded: 'Chargement terminé',
    delivered: 'Livraison terminée (POD)',
  },
  es: {
    arrived_pickup: 'Llegada a la carga',
    arrived_delivery: 'Llegada a la entrega',
    loading: 'Carga iniciada',
    unloading: 'Descarga iniciada',
    loaded: 'Carga completada',
    delivered: 'Entrega completada (POD)',
  },
  pl: {
    arrived_pickup: 'Przyjazd na załadunek',
    arrived_delivery: 'Przyjazd na rozładunek',
    loading: 'Załadunek rozpoczęty',
    unloading: 'Rozładunek rozpoczęty',
    loaded: 'Załadunek zakończony',
    delivered: 'Dostawa zakończona (POD)',
  },
};

export function localizeStopEvent(
  previous: string,
  next: string,
  stopType: string,
  language: unknown,
): string {
  const lang = normalizeNotificationLanguage(language);
  const type = stopType === 'pickup' ? 'pickup' : 'delivery';
  if (next === 'arrived') return STOP_EVENTS[lang][type === 'pickup' ? 'arrived_pickup' : 'arrived_delivery'];
  if (next === 'loading') return STOP_EVENTS[lang].loading;
  if (next === 'unloading') return STOP_EVENTS[lang].unloading;
  if (next === 'completed') return STOP_EVENTS[lang][type === 'pickup' ? 'loaded' : 'delivered'];
  return `${STOP_EVENTS[lang].loading}: ${previous} → ${next}`;
}

const TRIP_EVENTS: Record<NotificationLanguage, Record<'assigned' | 'dispatched' | 'cancelled' | 'updated', string>> = {
  ro: { assigned: 'Cursă atribuită', dispatched: 'Cursă nouă asignată', cancelled: 'Cursă anulată', updated: 'Cursă actualizată' },
  en: { assigned: 'Trip assigned', dispatched: 'New trip assigned', cancelled: 'Trip cancelled', updated: 'Trip updated' },
  nl: { assigned: 'Rit toegewezen', dispatched: 'Nieuwe rit toegewezen', cancelled: 'Rit geannuleerd', updated: 'Rit bijgewerkt' },
  de: { assigned: 'Transport zugewiesen', dispatched: 'Neuer Transport zugewiesen', cancelled: 'Transport storniert', updated: 'Transport aktualisiert' },
  fr: { assigned: 'Trajet attribué', dispatched: 'Nouveau trajet attribué', cancelled: 'Trajet annulé', updated: 'Trajet mis à jour' },
  es: { assigned: 'Viaje asignado', dispatched: 'Nuevo viaje asignado', cancelled: 'Viaje cancelado', updated: 'Viaje actualizado' },
  pl: { assigned: 'Kurs przydzielony', dispatched: 'Nowy kurs przydzielony', cancelled: 'Kurs anulowany', updated: 'Kurs zaktualizowany' },
};

const SCHEDULE: Record<NotificationLanguage, { title: string; pickup: string; delivery: string; driver: string; vehicle: string }> = {
  ro: { title: 'Program modificat', pickup: 'încărcare', delivery: 'livrare', driver: 'șofer', vehicle: 'vehicul' },
  en: { title: 'Schedule changed', pickup: 'pickup', delivery: 'delivery', driver: 'driver', vehicle: 'vehicle' },
  nl: { title: 'Planning gewijzigd', pickup: 'laden', delivery: 'lossing', driver: 'chauffeur', vehicle: 'voertuig' },
  de: { title: 'Zeitplan geändert', pickup: 'Beladung', delivery: 'Entladung', driver: 'Fahrer', vehicle: 'Fahrzeug' },
  fr: { title: 'Planning modifié', pickup: 'chargement', delivery: 'livraison', driver: 'chauffeur', vehicle: 'véhicule' },
  es: { title: 'Horario modificado', pickup: 'carga', delivery: 'entrega', driver: 'conductor', vehicle: 'vehículo' },
  pl: { title: 'Harmonogram zmieniony', pickup: 'załadunek', delivery: 'dostawa', driver: 'kierowca', vehicle: 'pojazd' },
};

export function localizeScheduleChange(language: unknown, fields: string[]): string {
  const lang = normalizeNotificationLanguage(language);
  const labels = fields.map((field) => {
    if (field === 'plannedDeparture') return SCHEDULE[lang].pickup;
    if (field === 'plannedArrival') return SCHEDULE[lang].delivery;
    if (field === 'driverId') return SCHEDULE[lang].driver;
    return SCHEDULE[lang].vehicle;
  });
  return `${SCHEDULE[lang].title}: ${labels.join(', ')}`;
}

export function localizeTripEvent(status: unknown, language: unknown): string {
  const lang = normalizeNotificationLanguage(language);
  const key = String(status || '').toLowerCase();
  if (key === 'assigned') return TRIP_EVENTS[lang].assigned;
  if (key === 'dispatched') return TRIP_EVENTS[lang].dispatched;
  if (key === 'cancelled') return TRIP_EVENTS[lang].cancelled;
  return TRIP_EVENTS[lang].updated;
}