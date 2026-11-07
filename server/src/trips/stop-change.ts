import { normalizeNotificationLanguage, NotificationLanguage } from './trip-notification-i18n';

export const STOP_CHANGE_FIELDS = [
  'address',
  'city',
  'contactPerson',
  'phone',
  'reference',
  'notes',
  'timeWindowMin',
  'timeWindowMax',
] as const;

export type StopChangeField = (typeof STOP_CHANGE_FIELDS)[number];

export interface StopChange {
  field: StopChangeField;
  oldValue: unknown;
  newValue: unknown;
}

const normalize = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const date = value instanceof Date ? value : null;
  return date ? date.toISOString() : String(value).trim();
};

/** Only real field changes produce an event; a no-op save must stay silent. */
export function diffStopChanges(before: any, patch: any): StopChange[] {
  return STOP_CHANGE_FIELDS.flatMap((field) => {
    if (patch[field] === undefined) return [];
    const oldValue = normalize(before?.[field]);
    const newValue = normalize(patch[field]);
    return oldValue === newValue ? [] : [{ field, oldValue: before?.[field] ?? null, newValue: patch[field] ?? null }];
  });
}

const LABELS: Record<NotificationLanguage, Record<StopChangeField, string>> = {
  ro: { address: 'adresă', city: 'oraș', contactPerson: 'persoană de contact', phone: 'telefon', reference: 'referință', notes: 'instrucțiuni', timeWindowMin: 'început fereastră', timeWindowMax: 'sfârșit fereastră' },
  en: { address: 'address', city: 'city', contactPerson: 'contact person', phone: 'phone', reference: 'reference', notes: 'instructions', timeWindowMin: 'window start', timeWindowMax: 'window end' },
  nl: { address: 'adres', city: 'stad', contactPerson: 'contactpersoon', phone: 'telefoon', reference: 'referentie', notes: 'instructies', timeWindowMin: 'start tijdvenster', timeWindowMax: 'einde tijdvenster' },
  de: { address: 'Adresse', city: 'Ort', contactPerson: 'Ansprechpartner', phone: 'Telefon', reference: 'Referenz', notes: 'Anweisungen', timeWindowMin: 'Zeitfenster Beginn', timeWindowMax: 'Zeitfenster Ende' },
  fr: { address: 'adresse', city: 'ville', contactPerson: 'personne de contact', phone: 'téléphone', reference: 'référence', notes: 'instructions', timeWindowMin: 'début de créneau', timeWindowMax: 'fin de créneau' },
  es: { address: 'dirección', city: 'ciudad', contactPerson: 'persona de contacto', phone: 'teléfono', reference: 'referencia', notes: 'instrucciones', timeWindowMin: 'inicio de ventana', timeWindowMax: 'fin de ventana' },
  pl: { address: 'adres', city: 'miasto', contactPerson: 'osoba kontaktowa', phone: 'telefon', reference: 'referencja', notes: 'instrukcje', timeWindowMin: 'początek okna', timeWindowMax: 'koniec okna' },
};

const TITLES: Record<NotificationLanguage, string> = {
  ro: 'Oprire modificată',
  en: 'Stop changed',
  nl: 'Stop gewijzigd',
  de: 'Stopp geändert',
  fr: 'Arrêt modifié',
  es: 'Parada modificada',
  pl: 'Postój zmieniony',
};

function display(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function localizeStopChange(change: StopChange, language: unknown): string {
  const lang = normalizeNotificationLanguage(language);
  return `${TITLES[lang]}: ${LABELS[lang][change.field]}: ${display(change.oldValue)} → ${display(change.newValue)}`;
}